const getStabilityPoolOverview = require('./get_stability_pool_overview');
const getVLENDStakingOverview = require('./get_vlend_staking_overview');

const getStabilityPoolAPR = async (chain) => {
  const stakeVusd = await getStabilityPoolOverview(chain);
  const stakeVLEND = await getVLENDStakingOverview(chain);

  return [
    {
      name: 'vLend Stability Pool',
      pool: 'Stability Pool',
      depositToken: 'vUSD',
      rewardTokenSymbol: 'VLEND',
      tvl: stakeVusd.totalVusdStakedHuman,
      apr: stakeVusd.APR,
      url: 'https://app.vlend.fi/staking'
    },
    {
      name: 'vLend Staking',
      pool: 'VLEND Staking',
      depositToken: 'VLEND',
      rewardTokenSymbol: 'vUSD',
      tvl: stakeVLEND.totalVLENDStakedUsdValueHuman,
      apr: stakeVLEND.APR,
      url: 'https://app.vlend.fi/staking'
    }
  ];
};

const getYields = async (chain) => {
  return {
    StabilityPool: await getStabilityPoolAPR(chain)
  };
};

module.exports = getYields;
