const getVaultsOverview = require('../utils/get_vaults_overview');

module.exports = function (fastify, opts) {
  fastify.get('/vaults/overview', async (request, reply) => {
    try {
      const vaults = await getVaultsOverview(opts.chain);
      return vaults;
    } catch (error) {
      console.error('Error in getVaultsOverview:', error); // Force logging
      reply.code(500).send({ error: error.message, stack: error.stack });
    }
  });
};
