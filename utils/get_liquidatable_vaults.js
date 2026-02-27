require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const getVaults = require('./get_vaults');
const { MulticallWrapper } = require('ethers-multicall-provider');
const chainData = require('./get_chain_data');

function addVaultInfo(vault) {
  return {
    address: vault,
    url: `/vaults/${vault}`
  };
}

async function getLiquidatableVaults(chain) {
  const { provider } = await chainData(chain);
  const vaultFactoryHelperAbi = await getAbi('VaultFactoryHelper', chain);
  const vaultFactoryAbi = await getAbi('VaultFactory', chain);
  const VaultFactoryHelper = new ethers.Contract(
    vaultFactoryHelperAbi.address,
    vaultFactoryHelperAbi.abi,
    provider
  );

  let vaults = await VaultFactoryHelper.getLiquidatableVaults(
    vaultFactoryAbi.address
  );

  vaults = vaults.map(addVaultInfo);
  return vaults;
}

module.exports = getLiquidatableVaults;
