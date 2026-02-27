const ethers = require('ethers');
const getAbi = require('./get_abi');
const getChainData = require('./get_chain_data');
const { MulticallWrapper } = require('ethers-multicall-provider');

async function getVlendStaked(chain) {
  const chainDataInstance = await getChainData(chain);
  const { provider } = chainDataInstance;
  const vlendStakingAbi = await getAbi('VLENDStaking', chain);
  const vlendStaking = new ethers.Contract(
    vlendStakingAbi.address,
    vlendStakingAbi.abi,
    provider
  );
  const totalVLENDstaked = await vlendStaking.totalSupply();
  return ethers.utils.formatEther(totalVLENDstaked);
}

async function getTvl(chain) {
  try {
    const chainDataInstance = await getChainData(chain);
    const { provider } = chainDataInstance;
    const multiCallProvider = MulticallWrapper.wrap(provider);
    const vaultFactoryAbi = await getAbi('VaultFactory', chain);
    const vaultFactoryHelperAbi = await getAbi('VaultFactoryHelper', chain);

    const vaultFactory = new ethers.Contract(
      vaultFactoryAbi.address,
      vaultFactoryAbi.abi,
      multiCallProvider
    );
    const vaultFactoryHelper = new ethers.Contract(
      vaultFactoryHelperAbi.address,
      vaultFactoryHelperAbi.abi,
      multiCallProvider
    );

    let protocolTvl = ethers.BigNumber.from(0);
    try {
      protocolTvl = await vaultFactoryHelper.getProtocolTvl(vaultFactory.address);
    } catch (e) {
      console.log('Error getting protocol TVL:', e.message);
    }

    const stakedVlend = await getVlendStaked(chain);
    const vlendPrice = 1; // Placeholder until DEX/oracle available on MegaETH

    return {
      tvl:
        parseFloat(ethers.utils.formatEther(protocolTvl)) +
        parseFloat(stakedVlend) * vlendPrice,
      protocolTvl: ethers.utils.formatEther(protocolTvl),
      vlendStaked: stakedVlend
    };
  } catch (error) {
    console.error('Error getting TVL:', error);
    throw error;
  }
}

module.exports = getTvl;
