require('dotenv').config();
const chainData = require('./get_chain_data');
const { ethers } = require('ethers');
const getAbi = require('./get_abi');

async function getCollateralPrice(tokenAddress, chain) {
  try {
    const { provider } = await chainData(chain);
    const abiData = await getAbi('TokenToPriceFeed', chain);

    if (!abiData.address || !abiData.abi) {
      throw new Error('Failed to load TokenToPriceFeed ABI or address');
    }

    const contract = new ethers.Contract(
      abiData.address,
      abiData.abi,
      provider
    );

    // First get the price feed address for this token
    const priceFeedAddress = await contract.tokenPriceFeed(tokenAddress);

    if (priceFeedAddress === ethers.constants.AddressZero) {
      throw new Error(`No price feed found for token ${tokenAddress}`);
    }

    try {
      // Then get the price from the price feed
      const price = await contract.tokenPrice(tokenAddress);
      console.log('Debug - Chain parameter:', chain);
      console.log('Debug - Address parameter:', tokenAddress);
      console.log('Debug - Price feed address:', priceFeedAddress);
      console.log('Debug - Price:', price.toString());

      return {
        priceInWei: price.toString(),
        priceHuman: ethers.utils.formatEther(price.toString())
      };
    } catch (error) {
      // Check if it's the price-not-available error
      if (error.message && error.message.includes('price-not-available')) {
        throw new Error(
          `Price feed is not currently available for token ${tokenAddress}`
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in getCollateralPrice:', error);
    throw error;
  }
}

module.exports = getCollateralPrice;
