require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const getCollaterals = require('./get_collaterals');
const chainData = require('./get_chain_data');
const { MulticallWrapper } = require('ethers-multicall-provider');

function findCollateralSettings(collateralSettings, address) {
  for (let i = 0; i < collateralSettings.length; i++) {
    if (collateralSettings[i].address.toLowerCase() === address.toLowerCase()) {
      return collateralSettings[i];
    }
  }
  return null;
}

async function getVaultInfo(address, chain) {
  const { provider } = await chainData(chain);
  console.log(`Debug - Fetching Vault Info for ${address} on chain ${chain}`);

  const vaultAbi = await getAbi('Vault', chain);
  const vaultFactoryAbi = await getAbi('VaultFactory', chain);

  let Vault, VaultFactory;
  if (chain === 'mainnet') {
    // ✅ Use Multicall for mainnet
    const multiCallProvider = MulticallWrapper.wrap(provider);
    Vault = new ethers.Contract(address, vaultAbi.abi, multiCallProvider);
    VaultFactory = new ethers.Contract(
      vaultFactoryAbi.address,
      vaultFactoryAbi.abi,
      multiCallProvider
    );
  } else if (chain === 'subtensor') {
    // ✅ Direct provider calls for subtensor
    Vault = new ethers.Contract(address, vaultAbi.abi, provider);
    VaultFactory = new ethers.Contract(
      vaultFactoryAbi.address,
      vaultFactoryAbi.abi,
      provider
    );
  } else {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  const collateralSettings = await getCollaterals(chain);

  console.log('Debug - Fetching priceFeed address from VaultFactory...');
  const priceFeedAddress = await VaultFactory.priceFeed();
  if (!priceFeedAddress || priceFeedAddress === ethers.constants.AddressZero) {
    throw new Error(`Invalid price feed address: ${priceFeedAddress}`);
  }
  console.log(`✅ Using PriceFeed contract at: ${priceFeedAddress}`);

  const priceFeedAbi = await getAbi('TokenToPriceFeed', chain);
  const PriceFeed = new ethers.Contract(
    priceFeedAddress,
    priceFeedAbi.abi,
    provider
  );

  // Fetch vault details
  console.log('Debug - Fetching vault details...');
  let collaterals,
    vaultName,
    owner,
    debt,
    healthFactor,
    liquidationFactor,
    borrowableRedemption,
    borrowableLiquidation,
    redemptionFactor;

  if (chain === 'mainnet') {
    // ✅ Use multicall for mainnet
    [
      collaterals,
      vaultName,
      owner,
      debt,
      healthFactor,
      liquidationFactor,
      borrowableRedemption,
      borrowableLiquidation,
      redemptionFactor
    ] = await Promise.all([
      Vault.collaterals(),
      Vault.name(),
      Vault.vaultOwner(),
      Vault.debt(),
      Vault.healthFactor(false),
      Vault.healthFactor(true),
      Vault.borrowableWithDiff(ethers.constants.AddressZero, 0, 0, true),
      Vault.borrowableWithDiff(ethers.constants.AddressZero, 0, 0, false),
      VaultFactory.redemptionHealthFactorLimit()
    ]);
  } else if (chain === 'subtensor') {
    // ✅ Direct calls for subtensor
    collaterals = await Vault.collaterals();
    vaultName = await Vault.name();
    owner = await Vault.vaultOwner();
    debt = await Vault.debt();
    healthFactor = await Vault.healthFactor(false);
    liquidationFactor = await Vault.healthFactor(true);
    borrowableRedemption = await Vault.borrowableWithDiff(
      ethers.constants.AddressZero,
      0,
      0,
      true
    );
    borrowableLiquidation = await Vault.borrowableWithDiff(
      ethers.constants.AddressZero,
      0,
      0,
      false
    );
    redemptionFactor = await VaultFactory.redemptionHealthFactorLimit();
  }

  console.log('Debug - Found collaterals:', collaterals);

  let tvl = ethers.BigNumber.from(0);
  const collateralInfo = [];

  for (let collateral of collaterals) {
    const settings = findCollateralSettings(collateralSettings, collateral);
    if (!settings) {
      console.warn(
        `⚠️ No settings found for collateral: ${collateral}, skipping`
      );
      continue;
    }

    console.log(`Debug - Processing collateral: ${collateral}`);
    let collateralAmount, collateralPrice, isRedeemable;

    if (chain === 'mainnet') {
      // ✅ Use multicall
      [collateralAmount, collateralPrice, isRedeemable] = await Promise.all([
        Vault.collateral(collateral),
        PriceFeed.tokenPrice(collateral),
        VaultFactory.isReedemable(address, collateral)
      ]);
    } else if (chain === 'subtensor') {
      // ✅ Direct calls for subtensor
      collateralAmount = await Vault.collateral(collateral);
      collateralPrice = await PriceFeed.tokenPrice(collateral);
      isRedeemable = await VaultFactory.isReedemable(address, collateral);
    }

    // Compute TVL
    const normalizedCollateralAmount = collateralAmount.mul(
      ethers.BigNumber.from(10).pow(18 - settings.decimals)
    );
    const collateralValue = normalizedCollateralAmount
      .mul(collateralPrice)
      .div(ethers.constants.WeiPerEther);

    tvl = tvl.add(collateralValue);

    // Calculate maxWithdrawable
    const borrowableHuman = ethers.utils.formatEther(borrowableLiquidation[1]);
    const borrowingCapacity = parseFloat(borrowableHuman);
    const maxWithdrawable =
      Math.floor(
        ((borrowingCapacity * (settings.mcr / 100)) /
          ethers.utils.formatEther(collateralPrice)) *
          100
      ) / 100;

    const finalMaxWithdrawable = debt.isZero()
      ? ethers.utils.formatUnits(collateralAmount, settings.decimals)
      : Math.min(
          maxWithdrawable,
          parseFloat(
            ethers.utils.formatUnits(collateralAmount, settings.decimals)
          )
        );

    collateralInfo.push({
      address: collateral,
      amount: ethers.utils.formatUnits(collateralAmount, settings.decimals),
      price: ethers.utils.formatEther(collateralPrice),
      valueInUsd: ethers.utils.formatEther(collateralValue),
      decimals: settings.decimals,
      symbol: settings.tokenName,
      isRedeemable,
      maxWithdrawable: finalMaxWithdrawable.toString()
    });
  }

  const debtHuman = ethers.utils.formatEther(debt);
  const redemptionThreshold = ethers.utils.formatEther(
    borrowableLiquidation[1]
  );
  const liquidationThreshold = ethers.utils.formatEther(
    borrowableRedemption[1]
  );
  const healthFactorHuman = ethers.utils.formatEther(healthFactor);
  const liquidationFactorHuman = ethers.utils.formatEther(liquidationFactor);
  const redemptionFactorHuman = ethers.utils.formatEther(redemptionFactor);
  const tvlHuman = ethers.utils.formatEther(tvl);

  return {
    address,
    collaterals,
    vaultName,
    owner,
    debt: debtHuman,
    redemptionThreshold,
    liquidationThreshold,
    healthFactor: healthFactorHuman,
    liquidationFactor: liquidationFactorHuman,
    redemptionFactor: redemptionFactorHuman,
    tvl: tvlHuman,
    collateralInfo,
    borrowable: borrowableRedemption[0]
  };
}

module.exports = getVaultInfo;
