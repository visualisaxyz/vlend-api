require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const { MulticallWrapper } = require('ethers-multicall-provider');
const getVaults = require('./get_vaults');
const getChainData = require('./get_chain_data');
const getCollaterals = require('./get_collaterals');
const getCollateralPrice = require('./get_collateral_price');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function refreshStatistics(chain) {
  try {
    const { provider } = await getChainData(chain);
    const multiCallProvider = MulticallWrapper.wrap(provider);
    const vaultFactoryAbi = await getAbi('VaultFactory', chain);
    const vaultFactoryHelperAbi = await getAbi('VaultFactoryHelper', chain);
    const VLENDStakingAbi = await getAbi('VLENDStaking', chain);
    const StabilityPoolAbi = await getAbi('StabilityPool', chain);
    const MintableTokenAbi = await getAbi('MintableToken', chain);
    const Vault = await getAbi('Vault', chain);
    const collateralData = await getCollaterals(chain);

    const VLENDStaking = new ethers.Contract(
      VLENDStakingAbi.address,
      VLENDStakingAbi.abi,
      multiCallProvider
    );

    const StabilityPool = new ethers.Contract(
      StabilityPoolAbi.address,
      StabilityPoolAbi.abi,
      multiCallProvider
    );

    const VaultFactory = new ethers.Contract(
      vaultFactoryAbi.address,
      vaultFactoryAbi.abi,
      multiCallProvider
    );

    const vaultFactoryHelper = new ethers.Contract(
      vaultFactoryHelperAbi.address,
      vaultFactoryHelperAbi.abi,
      multiCallProvider
    );

    const MintableToken = new ethers.Contract(
      MintableTokenAbi.address,
      MintableTokenAbi.abi,
      multiCallProvider
    );

    const totalStake = await VLENDStaking.totalSupply();

    let tvl = ethers.BigNumber.from('0');
    try {
      tvl = await vaultFactoryHelper.getProtocolTvl(VaultFactory.address);
    } catch (error) {
      console.log('Error getting TVL, defaulting to 0:', error.message);
    }

    const [redemptionHealthFactorLimit, circulatingVusd, vusdInStabilityPool, VLENDinStakingPool, vaults, maxDebtPerHour, debtWindowAmount, debtCeiling] = await Promise.all([
      VaultFactory.redemptionHealthFactorLimit(),
      VaultFactory.totalDebt(),
      StabilityPool.totalDeposit(),
      totalStake,
      getVaults(chain),
      VaultFactory.maxDebtPerWindow ? VaultFactory.maxDebtPerWindow() : Promise.resolve(ethers.BigNumber.from(0)),
      VaultFactory.debtWindowAmount ? VaultFactory.debtWindowAmount() : Promise.resolve(ethers.BigNumber.from(0)),
      VaultFactory.debtCeiling ? VaultFactory.debtCeiling() : Promise.resolve(ethers.BigNumber.from(ethers.constants.MaxUint256))
    ]);

    const vusdLeftToBorrowInCurrentHour = debtWindowAmount && maxDebtPerHour && debtWindowAmount.gt(maxDebtPerHour) ? ethers.BigNumber.from(0) : (maxDebtPerHour || ethers.BigNumber.from(0)).sub(debtWindowAmount || ethers.BigNumber.from(0));
    const currentDebtCeilingPercentage = debtCeiling && debtCeiling.gt(0) ? circulatingVusd.mul(100).div(debtCeiling) : ethers.BigNumber.from(0);

    const vaultsHealthFactorsPromises = [];
    const vaultsDebtPromises = [];

    for (let i = 0; i < vaults.length; i++) {
      const vault = new ethers.Contract(vaults[i].address, Vault.abi, multiCallProvider);
      vaultsDebtPromises.push(vault.debt());
      vaultsHealthFactorsPromises.push(vault.healthFactor(true));
    }

    const vaultsHealthFactors = await Promise.allSettled(vaultsHealthFactorsPromises);
    const vaultsDebt = await Promise.allSettled(vaultsDebtPromises);

    const vaultsHealthFactorsValues = vaultsHealthFactors.map((hf) => {
      if (hf.status === 'fulfilled') {
        const maxHealthFactor = ethers.utils.parseEther('100');
        if (hf.value.gt(maxHealthFactor)) return parseFloat(ethers.utils.formatEther(maxHealthFactor));
        return parseFloat(ethers.utils.formatEther(hf.value));
      }
      return 0;
    });

    const skip100Vaults = vaultsHealthFactorsValues.filter((hf) => hf !== 100);
    const minHealthFactor = skip100Vaults.length ? Math.min(...skip100Vaults) : 0;
    const maxHealthFactor = skip100Vaults.length ? Math.max(...skip100Vaults) : 0;
    const avgHealthFactor = skip100Vaults.length ? skip100Vaults.reduce((a, b) => a + b, 0) / skip100Vaults.length : 0;

    const vaultsUnderHealthFactorLimit = [];
    const healthFactorLimit = parseFloat(ethers.utils.formatEther(redemptionHealthFactorLimit));
    for (let i = 0; i < vaults.length; i++) {
      if (vaultsHealthFactorsValues[i] < healthFactorLimit) {
        vaultsUnderHealthFactorLimit.push({
          ...vaults[i],
          healthFactor: vaultsHealthFactorsValues[i],
          healthFactorLimit
        });
      }
    }

    for (let i = 0; i < collateralData.length; i++) {
      try {
        const cap = await VaultFactory.collateralCap(collateralData[i].address);
        const capUsage = await VaultFactory.collateral(collateralData[i].address);
        const price = await getCollateralPrice(collateralData[i].address, chain);
        collateralData[i].cap = parseFloat(ethers.utils.formatUnits(cap, collateralData[i].decimals));
        collateralData[i].capUsage = parseFloat(ethers.utils.formatUnits(capUsage, collateralData[i].decimals));
        collateralData[i].capUsagePercentage = collateralData[i].cap > 0 ? parseFloat((collateralData[i].capUsage / collateralData[i].cap) * 100).toFixed(2) : 0;
        collateralData[i].price = price?.priceHuman || 0;
        collateralData[i].capInUsd = collateralData[i].cap * collateralData[i].price;
        collateralData[i].capUsageInUsd = collateralData[i].capUsage * collateralData[i].price;
      } catch (e) {
        console.log('Error getting collateral data:', e.message);
      }
    }

    const collateralBackingPerVusd = circulatingVusd.gt(0)
      ? parseFloat(ethers.utils.formatEther(tvl.mul(ethers.utils.parseEther('1')).div(circulatingVusd))).toFixed(2)
      : '0.00';

    const finalData = {
      tvl: ethers.utils.formatEther(tvl),
      circulatingVusd: ethers.utils.formatEther(circulatingVusd),
      vusdInStabilityPool: ethers.utils.formatEther(vusdInStabilityPool),
      VLENDinStakingPool: ethers.utils.formatEther(VLENDinStakingPool),
      totalVaultsCreated: vaults.length,
      avgCollateralPerVault: vaults.length ? ethers.utils.formatEther(tvl.div(vaults.length)) : '0',
      avgDebtPerVault: vaults.length ? ethers.utils.formatEther(circulatingVusd.div(vaults.length)) : '0',
      collateralBackingPerVusd,
      maxDebtPerHour: maxDebtPerHour ? ethers.utils.formatEther(maxDebtPerHour) : '0',
      vusdLeftToBorrowInCurrentHour: ethers.utils.formatEther(vusdLeftToBorrowInCurrentHour),
      vusdHardCap: debtCeiling ? ethers.utils.formatEther(debtCeiling) : '0',
      currentDebtCeilingPercentage: currentDebtCeilingPercentage.toString(),
      healthFactor: {
        min: minHealthFactor,
        max: maxHealthFactor,
        avg: avgHealthFactor,
        redemptionLimit: ethers.utils.formatEther(redemptionHealthFactorLimit)
      },
      vaultsUnderHealthFactorLimit,
      collateralData
    };

    const { error } = await supabase.from('historical_statistics').insert({
      chain: chain,
      data: finalData
    });

    if (error) {
      console.error('Error inserting into Supabase:', error);
      throw error;
    }

    return finalData;
  } catch (error) {
    console.error('Error in refreshStatistics:', error);
    throw error;
  }
}

module.exports = refreshStatistics;
