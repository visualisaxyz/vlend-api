require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const { MulticallWrapper } = require('ethers-multicall-provider');
const chainData = require('./get_chain_data');

function addVaultInfo(vault) {
  return {
    address: vault,
    url: `/vaults/${vault}`
  };
}

async function getVaultsByCollateral(collateralAddress, chain) {
  const { provider } = await chainData(chain);
  const multiCallProvider = MulticallWrapper.wrap(provider);
  const vaultFactoryHelperAbi = await getAbi('VaultFactoryHelper', chain);
  const vaultFactoryAbi = await getAbi('VaultFactory', chain);
  const VaultFactoryHelper = new ethers.Contract(
    vaultFactoryHelperAbi.address,
    vaultFactoryHelperAbi.abi,
    multiCallProvider
  );
  const vaultAbi = await getAbi('Vault', chain);
  let vaults = await VaultFactoryHelper.getAllVaults(vaultFactoryAbi.address);

  const tokenAbi = await getAbi('VLEND', chain);
  const collateralToken = new ethers.Contract(
    collateralAddress,
    tokenAbi.abi,
    multiCallProvider
  );

  const collateralDecimals = await collateralToken.decimals();

  const vaultsByCollateralPromises = [];
  const vaultsOwnersPromises = [];
  const vaultsDebtPromises = [];
  const vaultsVersionPromises = [];

  for (let i = 0; i < vaults.length; i++) {
    const vault = new ethers.Contract(
      vaults[i],
      vaultAbi.abi,
      multiCallProvider
    );

    vaultsByCollateralPromises.push(vault.collateral(collateralAddress));
    vaultsOwnersPromises.push(vault.vaultOwner());
    vaultsDebtPromises.push(vault.debt());
    vaultsVersionPromises.push(vault.VERSION());
  }

  const vaultsByCollateral = await Promise.all(vaultsByCollateralPromises);
  const vaultsOwners = await Promise.all(vaultsOwnersPromises);
  const vaultsDebt = await Promise.all(vaultsDebtPromises);
  const vaultsVersion = await Promise.all(vaultsVersionPromises);
  const newVaults = [];

  for (let i = 0; i < vaultsByCollateral.length; i++) {
    if (vaultsByCollateral[i].gt(0)) {
      newVaults.push({
        address: vaults[i],
        url: `/vaults/${vaults[i]}`,
        collateralAmount: ethers.utils.formatUnits(
          vaultsByCollateral[i],
          collateralDecimals
        ),
        owner: vaultsOwners[i],
        debt: ethers.utils.formatEther(vaultsDebt[i]),
        version: vaultsVersion[i].toString()
      });
    }
  }

  const uniqueOwnersCount = new Set(newVaults.map((vault) => vault.owner)).size;
  const ownersList = new Set(newVaults.map((vault) => vault.owner)).values();

  console.log(ownersList);

  return {
    vaults: newVaults,
    uniqueOwnersCount,
    ownersList: Array.from(ownersList),
    vaultCount: newVaults.length
  };
}

module.exports = getVaultsByCollateral;
