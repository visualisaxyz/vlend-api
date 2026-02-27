require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const getVaults = require('./get_vaults');
const { MulticallWrapper } = require('ethers-multicall-provider');
const getVaultInfo = require('./get_vault_info');
const getCollateralPrice = require('./get_collateral_price');
const chainData = require('./get_chain_data');

async function getRedeemableVaults(chain) {
  console.log('Chain received:', chain);

  const { provider } = await chainData(chain);
  console.log('Provider obtained');

  const multiCallProvider = MulticallWrapper.wrap(provider);
  console.log('Multicall provider wrapped');

  const vaultFactoryHelperAbi = await getAbi('VaultFactoryHelper', chain);
  const vaultFactoryAbi = await getAbi('VaultFactory', chain);
  const vaultAbi = await getAbi('Vault', chain);
  const tokenAbi = await getAbi('VLEND', chain);
  console.log('All ABIs loaded');

  const VaultFactoryHelper = new ethers.Contract(
    vaultFactoryHelperAbi.address,
    vaultFactoryHelperAbi.abi,
    multiCallProvider
  );
  console.log('VaultFactoryHelper contract created');

  const VaultFactory = new ethers.Contract(
    vaultFactoryAbi.address,
    vaultFactoryAbi.abi,
    multiCallProvider
  );
  console.log('VaultFactory contract created');

  const [vaultAddresses, collateralAddresses] =
    await VaultFactoryHelper.getRedeemableVaults(VaultFactory.address, true);
  console.log('Got vault addresses:', vaultAddresses);
  console.log('Got collateral addresses:', collateralAddresses);

  const vaultsDebtPromises = [];
  const vaultsOwnersPromises = [];
  const vaultsCollateralPromises = [];

  for (let i = 0; i < vaultAddresses.length; i++) {
    const vault = new ethers.Contract(
      vaultAddresses[i],
      vaultAbi.abi,
      multiCallProvider
    );

    vaultsDebtPromises.push(vault.debt());
    vaultsOwnersPromises.push(vault.vaultOwner());
    vaultsCollateralPromises.push(vault.collateral(collateralAddresses[i]));
  }

  const vaultsDebt = await Promise.all(vaultsDebtPromises);
  const vaultsOwners = await Promise.all(vaultsOwnersPromises);
  const vaultsCollateral = await Promise.all(vaultsCollateralPromises);

  const vaults = [];

  for (let i = 0; i < vaultAddresses.length; i++) {
    const token = new ethers.Contract(
      collateralAddresses[i],
      tokenAbi.abi,
      multiCallProvider
    );

    const collateralPrice = await getCollateralPrice(
      collateralAddresses[i],
      chain
    );
    const decimals = await token.decimals();
    const collateralValue = vaultsCollateral[i]
      .mul(collateralPrice.priceInWei)
      .div(ethers.utils.parseUnits('1', decimals));
    const maxReedemable = vaultsDebt[i]
      .mul(ethers.utils.parseUnits('1', decimals))
      .div(collateralPrice.priceInWei);
    vaults.push({
      address: vaultAddresses[i],
      debt: vaultsDebt[i].toString(),
      debtHuman: ethers.utils.formatUnits(vaultsDebt[i], decimals),
      owner: vaultsOwners[i],
      collateralAmount: vaultsCollateral[i].toString(),
      collateralAmountHuman: ethers.utils.formatUnits(
        vaultsCollateral[i],
        decimals
      ),
      collateralValue: collateralValue.toString(),
      collateralValueHuman: ethers.utils.formatUnits(collateralValue, decimals),
      collateralToken: collateralAddresses[i],
      collateralTokenSymbol: await token.symbol(),
      maxReedemable: maxReedemable.toString(),
      maxReedemableHuman: ethers.utils.formatUnits(maxReedemable, decimals),
      price: collateralPrice,
      url: `/vaults/${vaultAddresses[i]}`
    });
  }

  return vaults;
}

module.exports = getRedeemableVaults;
