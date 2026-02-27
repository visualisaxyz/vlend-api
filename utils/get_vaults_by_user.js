require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const chainData = require('./get_chain_data');
const { MulticallWrapper } = require('ethers-multicall-provider');

function addVaultInfo(vault) {
  console.log('Debug - Adding vault info for:', vault);
  return {
    address: vault,
    url: `/vaults/${vault}`
  };
}

async function getVaultsByUser(address, chain) {
  console.log('Debug - Getting vaults for address:', address, 'chain:', chain);

  try {
    const { provider: baseProvider } = await chainData(chain);
    console.log('Debug - Base provider initialized');

    // Initialize the appropriate provider based on chain
    const provider =
      chain === 'mainnet' ? MulticallWrapper.wrap(baseProvider) : baseProvider;

    const vaultFactoryAbi = await getAbi('VaultFactory', chain);
    const vaultAbi = await getAbi('Vault', chain);
    const tokenToPriceFeedAbi = await getAbi('TokenToPriceFeed', chain);

    const VaultFactory = new ethers.Contract(
      vaultFactoryAbi.address,
      vaultFactoryAbi.abi,
      provider
    );

    // Fetch the number of vaults owned by the user
    const vaultLength = await VaultFactory.vaultsByOwnerLength(address);
    console.log('Debug - Vault length:', vaultLength.toString());

    if (vaultLength.toNumber() === 0) {
      return [];
    }

    let vaults = [];
    for (let i = 0; i < vaultLength; i++) {
      const vaultAddress = await VaultFactory.vaultsByOwner(address, i);
      vaults.push(vaultAddress);
    }

    console.log('Debug - Found vaults:', vaults);

    const vaultsVersionPromises = [];
    const vaultsTvlPromises = [];

    if (chain === 'mainnet') {
      // Mainnet: Use Multicall (now using the already wrapped provider)
      const vaultFactoryHelperAbi = await getAbi('VaultFactoryHelper', chain);

      const VaultFactoryHelper = new ethers.Contract(
        vaultFactoryHelperAbi.address,
        vaultFactoryHelperAbi.abi,
        provider // Using the multicall provider we initialized earlier
      );

      for (let vaultAddress of vaults) {
        console.log('Debug - Processing vault:', vaultAddress);
        const vault = new ethers.Contract(vaultAddress, vaultAbi.abi, provider);

        vaultsVersionPromises.push(vault.VERSION());
        vaultsTvlPromises.push(VaultFactoryHelper.getVaultTvl(vaultAddress));
      }
    } else if (chain === 'subtensor') {
      // ✅ Testnet: No Multicall, Fetch priceFeed manually
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

      for (let vaultAddress of vaults) {
        console.log('Debug - Processing vault:', vaultAddress);
        const vault = new ethers.Contract(vaultAddress, vaultAbi.abi, provider);

        vaultsVersionPromises.push(vault.VERSION());

        // ✅ Calculate TVL manually
        let tvl = ethers.BigNumber.from(0);
        const collaterals = await vault.collaterals();

        for (let collateral of collaterals) {
          const collateralAmount = await vault.collateral(collateral);

          // ✅ Fetch price feed for the collateral
          const priceFeedContract = await TokenToPriceFeed.tokenPriceFeed(
            collateral
          );
          if (priceFeedContract === ethers.constants.AddressZero) {
            console.warn(`⚠️ No price feed for collateral: ${collateral}`);
            continue; // Skip if no price feed
          }

          // ✅ Fetch price of collateral
          const collateralPrice = await TokenToPriceFeed.tokenPrice(collateral);

          // ✅ Compute TVL
          tvl = tvl.add(
            collateralAmount
              .mul(collateralPrice)
              .div(ethers.utils.parseUnits('1', 18))
          );
        }

        vaultsTvlPromises.push(tvl);
      }
    }

    const vaultsVersion = await Promise.all(vaultsVersionPromises);
    const vaultsTvl = await Promise.all(vaultsTvlPromises);
    console.log(
      'Debug - Vault TVLs:',
      vaultsTvl.map((tvl) => tvl.toString())
    );
    console.log('Debug - Vault versions:', vaultsVersion);

    const newVaults = [];

    for (let i = 0; i < vaults.length; i++) {
      const tvl = vaultsTvl[i];
      console.log('Debug - Checking vault:', {
        address: vaults[i],
        version: vaultsVersion[i],
        tvl: ethers.utils.formatEther(tvl)
      });

      if (
        vaultsVersion[i] === '1.0.0' &&
        tvl.lte(ethers.utils.parseEther('0.0001'))
      ) {
        console.log('Debug - Skipping vault due to version and TVL');
        continue;
      } else {
        console.log('Debug - Adding vault to final list:', vaults[i]);
        newVaults.push(vaults[i]);
      }
    }

    const result = newVaults.map(addVaultInfo);
    console.log('Debug - Final result:', result);
    return result;
  } catch (error) {
    console.error('Error in getVaultsByUser:', error);
    throw error;
  }
}

module.exports = getVaultsByUser;
