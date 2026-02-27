require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const chainData = require('./get_chain_data');
const { parseEther } = require('ethers/lib/utils');

async function getVLENDStakingOverview(chain) {
  if (!chain) {
    throw new Error('Chain parameter is required');
  }

  const { provider } = await chainData(chain);
  const vlendStakingAbi = await getAbi('VLENDStaking', chain);
  const vlendStaking = new ethers.Contract(
    vlendStakingAbi.address,
    vlendStakingAbi.abi,
    provider
  );

  const totalVLENDstaked = await vlendStaking.totalSupply();

  // VLEND price placeholder (1 USD) until DEX/oracle available on MegaETH
  const pricePerVLEND = ethers.utils.parseEther('1');
  const vusdPrice = ethers.utils.parseEther('1');

  const totalVLENDStakedInUsd = totalVLENDstaked
    .mul(pricePerVLEND)
    .div(vusdPrice);

  return {
    totalVLENDStakedBN: totalVLENDstaked.toString(),
    totalVLENDStakedHuman: ethers.utils.formatEther(totalVLENDstaked),
    totalVLENDStakedUsdValueBN: totalVLENDStakedInUsd.toString(),
    totalVLENDStakedUsdValueHuman: ethers.utils.formatEther(totalVLENDStakedInUsd),
    totalVusdRewardsBN: '0',
    totalVusdRewardsHuman: '0',
    APR: '0.00',
    lastFeeTime: '0'
  };
}

module.exports = getVLENDStakingOverview;
