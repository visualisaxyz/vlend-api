require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const chainData = require('./get_chain_data');

async function getStabilityPoolRewards(user_address, chain) {
  const { provider } = await chainData(chain);
  const stabilityPoolAbi = await getAbi('StabilityPool', chain);
  const VLENDAbi = await getAbi('VLEND', chain);
  const vlend = new ethers.Contract(VLENDAbi.address, VLENDAbi.abi, provider);
  const stabilityPool = new ethers.Contract(
    stabilityPoolAbi.address,
    stabilityPoolAbi.abi,
    provider
  );
  const vusdAbi = await getAbi('MintableToken', chain);
  const vusd = new ethers.Contract(vusdAbi.address, vusdAbi.abi, provider);

  const pendingReward = await stabilityPool.getDepositorVLENDGain(user_address);
  const pendingRewardHuman = ethers.utils.formatEther(pendingReward);

  return {
    pendingVLENDReward: pendingReward.toString(),
    pendingVLENDRewardHuman: pendingRewardHuman
  };
}

module.exports = getStabilityPoolRewards;
