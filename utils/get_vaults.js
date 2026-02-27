require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const chainData = require('./get_chain_data');

function addVaultInfo(vault) {
  return {
    address: vault,
    url: `/vaults/${vault}`
  };
}

async function getVaults(chain) {
  if (!chain) {
    throw new Error('Chain parameter is required');
  }

  try {
    console.log('Debug - getVaults called with chain:', chain);

    const { provider } = await chainData(chain);
    const network = await provider.getNetwork();
    console.log('Debug - Provider initialized with network:', {
      chainId: network.chainId,
      name: network.name
    });

    const vaultFactoryHelperAbi = await getAbi('VaultFactoryHelper', chain);
    if (!vaultFactoryHelperAbi || !vaultFactoryHelperAbi.address) {
      throw new Error(
        `Failed to load VaultFactoryHelper ABI for chain ${chain}`
      );
    }
    console.log('Debug - VaultFactoryHelper contract:', {
      address: vaultFactoryHelperAbi.address,
      methodsCount: vaultFactoryHelperAbi.abi.length,
      methods: vaultFactoryHelperAbi.abi
        .map((item) => item.name)
        .filter(Boolean)
    });

    const vaultFactoryAbi = await getAbi('VaultFactory', chain);
    if (!vaultFactoryAbi || !vaultFactoryAbi.address) {
      throw new Error(`Failed to load VaultFactory ABI for chain ${chain}`);
    }
    console.log('Debug - VaultFactory contract:', {
      address: vaultFactoryAbi.address
    });

    // Create contract instance with explicit provider
    const VaultFactoryHelper = new ethers.Contract(
      vaultFactoryHelperAbi.address,
      vaultFactoryHelperAbi.abi,
      provider
    );

    // Test DECIMAL_PRECISION call first
    try {
      const decimals = await VaultFactoryHelper.DECIMAL_PRECISION();
      console.log(
        'Debug - DECIMAL_PRECISION test successful:',
        decimals.toString()
      );
    } catch (e) {
      console.error('Debug - DECIMAL_PRECISION test failed:', {
        error: e.message,
        code: e.code,
        reason: e.reason
      });
    }

    // Call getAllVaults with explicit error handling
    console.log(
      'Debug - Calling getAllVaults with factory address:',
      vaultFactoryAbi.address
    );
    try {
      let vaults = await VaultFactoryHelper.getAllVaults(
        vaultFactoryAbi.address,
        {
          gasLimit: 3000000 // Add explicit gas limit
        }
      );
      console.log('Debug - Raw vaults response:', vaults);

      vaults = vaults.map(addVaultInfo);
      console.log('Debug - Processed vaults:', vaults);

      return vaults;
    } catch (contractError) {
      console.error('Debug - Contract call error:', {
        message: contractError.message,
        code: contractError.code,
        reason: contractError.reason,
        method: 'getAllVaults',
        args: [vaultFactoryAbi.address]
      });
      throw contractError;
    }
  } catch (error) {
    console.error('Error in getVaults:', {
      message: error.message,
      code: error.code,
      method: error.method,
      data: error.data,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = getVaults;
