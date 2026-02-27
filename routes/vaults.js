const getVaultsByUser = require('../utils/get_vaults_by_user');
const getVaultsOverview = require('../utils/get_vaults_overview');
const getCollaterals = require('../utils/get_collaterals');
const getVaultInfo = require('../utils/get_vault_info');
const getRedeemableVaults = require('../utils/get_redeemable_vaults');

module.exports = function (fastify, opts) {
  // Route for user's vaults
  fastify.get('/vaults', async (request, reply) => {
    try {
      const vaults = await getVaultsByUser(request.query.address, opts.chain);
      return vaults;
    } catch (error) {
      fastify.log.error(error);
      console.error('Detailed error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        headers: request.headers,
        origin: request.headers.origin
      });
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Route for individual vault
  fastify.get('/vaults/:address', async (request, reply) => {
    try {
      const { address } = request.params;
      const vaultInfo = await getVaultInfo(address, opts.chain);

      if (!vaultInfo) {
        reply.code(404).send({ error: 'Vault not found' });
        return;
      }

      return vaultInfo;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/redeemableVaults', async (request, reply) => {
    const chain = opts.chain;

    const redeemableVaults = await getRedeemableVaults(chain);

    console.log(redeemableVaults);

    return redeemableVaults;
  });
};
