const fp = require('fastify-plugin');
const getVLENDStakingOverview = require('../utils/get_vlend_staking_overview');

module.exports = fp(async (fastify, opts) => {
  const { chain } = opts;

  fastify.route({
    method: 'GET',
    url: '/vlend_staking/overview',
    handler: async (request, reply) => {
      try {
        const overview = await getVLENDStakingOverview(chain);
        return overview;
      } catch (error) {
        fastify.log.error(
          `Error fetching VLEND staking overview for chain ${chain}:`,
          error.message
        );
        reply.status(500).send({
          error: `Failed to fetch VLEND staking overview for chain: ${chain}`
        });
      }
    }
  });
});
