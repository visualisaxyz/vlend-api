require('dotenv').config();
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

async function getChainData(chain) {
  if (!chain) {
    throw new Error('Chain parameter is required');
  }

  if (chain !== 'megaeth') {
    throw new Error('vLend API supports MegaETH mainnet only. Use chain: "megaeth"');
  }

  console.log('Debug - Getting chain data for:', chain);

  try {
    const jsonData = require(`../data/addresses/${chain}.json`);

    const rpcUrl = process.env.MEGAETH_RPC_URL;
    if (!rpcUrl) {
      throw new Error('MEGAETH_RPC_URL environment variable is required');
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    return {
      jsonData: { ...jsonData, rpc: rpcUrl },
      provider
    };
  } catch (error) {
    console.error(`Error loading chain data for ${chain}:`, error);
    throw error;
  }
}

module.exports = getChainData;
