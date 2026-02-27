require('dotenv').config();
const ethers = require('ethers');
const getAbi = require('./get_abi');
const chainData = require('./get_chain_data');
const MemoryCache = require('./memory_cache');

async function getStabilityPoolDepositLogs() {
  try {
    const req = await fetch(
      'https://api.transpose.io/endpoint/stability-pool-stakers/3',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // free data who cares
          'X-API-KEY': 'broQDVChrfYZqdMy9O7du4KKEQARRzDf'
        }
      }
    );
    const res = await req.json();

    return res;
  } catch (error) {
    return {
      results: []
    };
  }
}

async function getStabilityPoolWithdrawLogs() {
  // sleep for 1 second
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const req = await fetch(
      'https://api.transpose.io/endpoint/stability-pool-withdraws/2',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // free data who cares
          'X-API-KEY': 'broQDVChrfYZqdMy9O7du4KKEQARRzDf'
        }
      }
    );
    const res = await req.json();

    return res;
  } catch (error) {
    return {
      results: []
    };
  }
}

const depositsCache = new MemoryCache({
  update: async () => getStabilityPoolDepositLogs(),
  ttl: 60 * 60 * 1000
});
const withdrawsCache = new MemoryCache({
  update: async () => getStabilityPoolWithdrawLogs(),
  ttl: 60 * 60 * 1000
});

async function getStakers() {
  const [totalDeposits, totalWithdraws] = await Promise.all([
    depositsCache.read(),
    withdrawsCache.read()
  ]);

  if (totalDeposits.status == 'error' || totalWithdraws.status == 'error') {
    return [];
  }

  // create a address => amount map
  let stakers = [];

  for (let i = 0; i < totalDeposits.results.length; i++) {
    let logData = totalDeposits.results[i].data;
    const parsedData = ethers.utils.defaultAbiCoder.decode(
      ['address', 'uint256'],
      logData
    );

    let address = parsedData[0];
    let amount = parsedData[1];

    if (stakers[address] == undefined) {
      stakers[address] = ethers.BigNumber.from(0);
    }

    stakers[address] = stakers[address].add(amount);
  }

  for (let i = 0; i < totalWithdraws.results.length; i++) {
    let logData = totalWithdraws.results[i].data;
    const parsedData = ethers.utils.defaultAbiCoder.decode(
      ['address', 'uint256'],
      logData
    );

    let address = parsedData[0];
    let amount = parsedData[1];

    if (stakers[address] !== undefined && stakers[address].gte(amount)) {
      stakers[address] = stakers[address].sub(amount);
    }
  }

  const filteredStakers = [];
  // iterate each staker and get the amount of vUSD they have
  for (let staker in stakers) {
    if (stakers[staker].gt(0)) {
      filteredStakers.push({
        address: staker,
        amount: ethers.utils.formatEther(stakers[staker])
      });
    }
  }

  return filteredStakers;
}

async function getStabilityPoolOverview(chain) {
  const stakers = getStakers();
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

  const totalVusdStaked = await vusd.balanceOf(stabilityPoolAbi.address);
  const totalVLENDRewards = await vlend.balanceOf(stabilityPoolAbi.address);

  const vlendPrice = ethers.utils.parseEther('1');

  const totalRewards = totalVLENDRewards
    .mul(vlendPrice)
    .div(ethers.utils.parseEther('1'));
  const VLENDPerMinute = await stabilityPool.vlendPerMinute();
  const VLENDPerDay = VLENDPerMinute.mul(60).mul(24);
  const VLENDPerYear = VLENDPerDay.mul(365);

  const VLENDPerYearInUsd = VLENDPerYear.mul(vlendPrice).div(
    ethers.utils.parseEther('1')
  );
  let apr;
  if (totalVusdStaked.gt(0))
    apr = VLENDPerYearInUsd.mul(ethers.utils.parseEther('1'))
      .div(totalVusdStaked)
      .mul(100);
  else apr = ethers.utils.parseEther('0');

  let aprHuman = parseFloat(ethers.utils.formatEther(apr));

  return {
    totalVusdStaked: totalVusdStaked.toString(),
    totalVusdStakedHuman: ethers.utils.formatEther(totalVusdStaked),
    totalVLENDRewards: totalVLENDRewards.toString(),
    totalVLENDRewardsHuman: ethers.utils.formatEther(totalVLENDRewards),
    totalVLENDRewardsInUsd: totalRewards.toString(),
    totalVLENDRewardsInUsdHuman: ethers.utils.formatEther(totalRewards),
    APR: aprHuman.toFixed(2),
    stakers: await stakers
  };
}

module.exports = getStabilityPoolOverview;
