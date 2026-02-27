require('dotenv').config();

// vLend API - MegaETH mainnet only
// VLEND and vUSD price logic - placeholder until DEX/oracle available on MegaETH

async function getVLENDPrice() {
  // Placeholder: 1 USD until DEX or oracle available on MegaETH
  return '1';
}

async function getVUSDPrice() {
  // vUSD is a stablecoin, peg to 1 USD
  return '1';
}

module.exports = {
  getVLENDPrice,
  getVUSDPrice
};
