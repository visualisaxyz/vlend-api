require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const chainData = require('./get_chain_data');
const { MulticallWrapper } = require('ethers-multicall-provider');

function addVaultInfo(vault) {
  return {
    address: vault,
    url: `/vaults/${vault}`
  };
}

async function getVaultsOverview(chain) {
  const { provider } = await chainData(chain);
  const vaultFactoryAbi = await getAbi('VaultFactory', chain);
  const vaultAbi = await getAbi('Vault', chain);
  const tokenToPriceFeedAbi = await getAbi('TokenToPriceFeed', chain);

  if (chain === 'megaeth') {
    // MegaETH logic (uses multicall)
    const vaultFactoryHelperAbi = await getAbi('VaultFactoryHelper', chain);
    const multiCallProvider = MulticallWrapper.wrap(provider);
    const VaultFactoryHelper = new ethers.Contract(
      vaultFactoryHelperAbi.address,
      vaultFactoryHelperAbi.abi,
      multiCallProvider
    );

    let vaults = await VaultFactoryHelper.getAllVaults(vaultFactoryAbi.address);
    vaults = vaults.map(addVaultInfo);

    const vaultDebts = await Promise.all(
      vaults.map((vault) => {
        const vaultContract = new ethers.Contract(
          vault.address,
          vaultAbi.abi,
          multiCallProvider
        );
        return vaultContract.debt();
      })
    );

    const vaultsHealthFactor = await Promise.all(
      vaults.map((vault) => {
        const vaultContract = new ethers.Contract(
          vault.address,
          vaultAbi.abi,
          multiCallProvider
        );
        return vaultContract.healthFactor(true);
      })
    );

    const vaultsCollaterals = await Promise.all(
      vaults.map((vault) => {
        const vaultContract = new ethers.Contract(
          vault.address,
          vaultAbi.abi,
          multiCallProvider
        );
        return vaultContract.collaterals();
      })
    );

    const vaultsOwners = await Promise.all(
      vaults.map((vault) => {
        const vaultContract = new ethers.Contract(
          vault.address,
          vaultAbi.abi,
          multiCallProvider
        );
        return vaultContract.vaultOwner();
      })
    );

    const vaultsTvl = await Promise.all(
      vaults.map((vault) => {
        return VaultFactoryHelper.getVaultTvl(vault.address);
      })
    );

    const vaultsVersion = await Promise.all(
      vaults.map((vault) => {
        const vaultContract = new ethers.Contract(
          vault.address,
          vaultAbi.abi,
          multiCallProvider
        );
        return vaultContract.VERSION();
      })
    );

    const vaultsName = await Promise.all(
      vaults.map((vault) => {
        const vaultContract = new ethers.Contract(
          vault.address,
          vaultAbi.abi,
          multiCallProvider
        );
        return vaultContract.name();
      })
    );

    vaults = vaults.map((vault, index) => {
      vault.debt = vaultDebts[index].toString();
      vault.debtHuman = ethers.utils.formatUnits(vaultDebts[index], 18);
      vault.collaterals = vaultsCollaterals[index];
      vault.vaultOwner = vaultsOwners[index];
      vault.tvl = ethers.utils.formatEther(vaultsTvl[index]);
      vault.version = vaultsVersion[index];
      vault.name = vaultsName[index];
      return vault;
    });

    vaults = vaults.map((vault, index) => {
      const healthFactor = vaultsHealthFactor[index];

      if (healthFactor.gt(ethers.utils.parseUnits('100', 18))) {
        vault.healthFactor = ethers.utils.formatUnits(
          ethers.utils.parseUnits('100', 18),
          18
        );
        return vault;
      }
      vault.healthFactor = ethers.utils.formatUnits(
        vaultsHealthFactor[index],
        18
      );
      return vault;
    });

    vaults = vaults.filter((vault) => {
      return vault.version !== '1.0.0';
    });

    return vaults;
  } else if (chain === 'subtensor') {
    // ✅ Testnet logic (without multicall)
    const VaultFactory = new ethers.Contract(
      vaultFactoryAbi.address,
      vaultFactoryAbi.abi,
      provider
    );

    // ✅ Fetch the priceFeed contract address from VaultFactory
    const priceFeedAddress = await VaultFactory.priceFeed();

    if (
      !priceFeedAddress ||
      priceFeedAddress === ethers.constants.AddressZero
    ) {
      throw new Error(`Invalid price feed address: ${priceFeedAddress}`);
    }

    console.log(`✅ Using PriceFeed contract at: ${priceFeedAddress}`);

    const TokenToPriceFeed = new ethers.Contract(
      priceFeedAddress,
      tokenToPriceFeedAbi.abi,
      provider
    );

    // Manually fetch all vault addresses
    const vaultCount = await VaultFactory.vaultCount();
    if (vaultCount.toNumber() === 0) {
      return [];
    }

    let vaults = [];
    let currentVault = await VaultFactory.firstVault();

    for (let i = 0; i < vaultCount; i++) {
      vaults.push(addVaultInfo(currentVault));
      currentVault = await VaultFactory.nextVault(currentVault);
    }

    // Fetch vault details one by one
    for (let vault of vaults) {
      const vaultContract = new ethers.Contract(
        vault.address,
        vaultAbi.abi,
        provider
      );

      vault.debt = (await vaultContract.debt()).toString();
      vault.debtHuman = ethers.utils.formatUnits(
        await vaultContract.debt(),
        18
      );
      vault.collaterals = await vaultContract.collaterals();
      vault.vaultOwner = await vaultContract.vaultOwner();
      vault.version = await vaultContract.VERSION();
      vault.name = await vaultContract.name();

      // Fetch health factor
      const healthFactor = await vaultContract.healthFactor(true);
      vault.healthFactor = ethers.utils.formatUnits(
        healthFactor.gt(ethers.utils.parseUnits('100', 18))
          ? ethers.utils.parseUnits('100', 18)
          : healthFactor,
        18
      );

      // Calculate TVL manually
      let tvl = ethers.BigNumber.from(0);
      for (let collateral of vault.collaterals) {
        const collateralAmount = await vaultContract.collateral(collateral);

        // ✅ Fetch price feed contract for this collateral
        const priceFeedContract = await TokenToPriceFeed.tokenPriceFeed(
          collateral
        );
        if (priceFeedContract === ethers.constants.AddressZero) {
          console.warn(`⚠️ No price feed for collateral: ${collateral}`);
          continue; // Skip if no price feed
        }

        // ✅ Fetch price of collateral
        const collateralPrice = await TokenToPriceFeed.tokenPrice(collateral);

        // ✅ Compute TVL - divide by 1e18 to get the correct dollar value
        tvl = tvl.add(
          collateralAmount
            .mul(collateralPrice)
            .div(ethers.utils.parseUnits('1', 9))
        );
      }
      vault.tvl = ethers.utils.formatEther(tvl);
    }

    // Filter out old vault versions
    vaults = vaults.filter((vault) => vault.version !== '1.0.0');

    return vaults;
  } else {
    throw new Error(`Unsupported chain ID: ${chain}`);
  }
}

module.exports = getVaultsOverview;
