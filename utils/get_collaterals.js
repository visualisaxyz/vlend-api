require('dotenv').config();
const ethers = require('ethers');
const getCollateralPrice = require('./get_collateral_price');
const getAbi = require('./get_abi');
const chainData = require('./get_chain_data');
const { MulticallWrapper } = require('ethers-multicall-provider');
const MemoryCache = require('./memory_cache');

async function getData(chain) {
  try {
    console.log('Debug - getData called with chain:', chain);

    const chainDataResult = await chainData(chain);
    const { provider } = chainDataResult;
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    const tokenToPriceFeed = await getAbi('TokenToPriceFeed', chain);
    console.log('Debug - TokenToPriceFeed:', {
      address: tokenToPriceFeed.address,
      hasAbi: !!tokenToPriceFeed.abi
    });

    let contract;
    if (chain === 'megaeth') {
      const multiCallProvider = MulticallWrapper.wrap(provider);
      contract = new ethers.Contract(
        tokenToPriceFeed.address,
        tokenToPriceFeed.abi,
        multiCallProvider
      );
    } else {
      contract = new ethers.Contract(
        tokenToPriceFeed.address,
        tokenToPriceFeed.abi,
        provider
      );
    }
    console.log('Debug - Contract initialized');

    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, `../data/collaterals_${chain}.json`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Collaterals file not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    const finalData = [];
    if (chain === 'megaeth') {
      // Use multicall for megaeth
      const borrowRatePromises = jsonData.map((collateral) =>
        contract.borrowRate(collateral.address)
      );

      const borrowRates = await Promise.allSettled(borrowRatePromises);

      for (let i = 0; i < jsonData.length; i++) {
        const collateral = jsonData[i];
        const borrowRate = borrowRates[i];

        if (borrowRate.status === 'fulfilled') {
          const borrowRateValue =
            parseFloat(ethers.utils.formatEther(borrowRate.value)) / 100;
          finalData.push({
            ...collateral,
            borrowRate: borrowRateValue
          });
        } else {
          console.error(
            `Failed to get borrow rate for ${collateral.tokenName}:`,
            borrowRate.reason
          );
          finalData.push({
            ...collateral,
            borrowRate: null
          });
        }
      }
} else {
        // Process sequentially
      for (const collateral of jsonData) {
        try {
          console.log(
            `Debug - Fetching borrow rate for ${collateral.tokenName}`
          );
          const borrowRate = await contract.borrowRate(collateral.address);
          const borrowRateValue =
            parseFloat(ethers.utils.formatEther(borrowRate)) / 100;

          finalData.push({
            ...collateral,
            borrowRate: borrowRateValue
          });
        } catch (error) {
          console.error(
            `Failed to get borrow rate for ${collateral.tokenName}:`,
            error.message
          );
          finalData.push({
            ...collateral,
            borrowRate: null
          });
        }
      }
    }

    console.log('Debug - Final data length:', finalData.length);
    return finalData;
  } catch (error) {
    console.error('Error in getData:', error.message);
    throw error;
  }
}
const cache = new MemoryCache({
  update: async (chain) => {
    try {
      console.log('Debug - Cache update starting for chain:', chain);
      const result = await getData(chain);
      console.log('Debug - Cache update result length:', result?.length);
      return result;
    } catch (error) {
      console.error('Cache update failed:', error.message);
      return []; // Return empty array instead of null
    }
  },
  ttl: 3600
});

async function getCollaterals(chain) {
  console.log('Debug - getCollaterals called with chain:', chain);
  const data = await cache.read(chain);
  console.log('Debug - getCollaterals result length:', data?.length);
  return data || [];
}

module.exports = getCollaterals;
