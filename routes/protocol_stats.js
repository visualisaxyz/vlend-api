const fp = require('fastify-plugin');
const getProtocolStats = require('../utils/get_protocol_stats');
const refreshStatistics = require('../utils/refresh_statistics');

module.exports = fp(async (fastify, opts) => {
  const { chain } = opts;

  fastify.route({
    method: 'GET',
    url: '/protocolStats',
    handler: async (request, reply) => {
      try {
        const stats = await getProtocolStats(chain);
        return stats;
      } catch (error) {
        fastify.log.error(
          `Error fetching protocol stats for chain ${chain}:`,
          error.message
        );
        reply.status(500).send({
          error: `Failed to fetch protocol stats for chain: ${chain}`
        });
      }
    }
  });

  fastify.route({
    method: 'GET',
    url: '/refreshStatistics',
    handler: async (request, reply) => {
      try {
        const result = await refreshStatistics(chain);
        return result;
      } catch (error) {
        fastify.log.error(
          `Error refreshing statistics for chain ${chain}:`,
          error.message
        );
        reply.status(500).send({
          error: `Failed to refresh statistics for chain: ${chain}`,
          message: error.message
        });
      }
    }
  });
});
