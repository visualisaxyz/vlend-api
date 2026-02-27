const fp = require('fastify-plugin');
const getChainData = require('../utils/get_chain_data');

// Export the routes as a plugin
module.exports = fp(async (fastify, opts) => {
  const { chain } = opts; // Extract chain parameter (e.g., 'mainnet' or 'arbitrum')

  fastify.route({
    method: 'GET',
    url: '/chain',
    handler: async (request, reply) => {
      try {
        // Fetch chain-specific data using the provided chain
        const chainData = await getChainData(chain);

        return {
          jsonData: chainData.jsonData,
          chain // Include the chain in the response for clarity
        };
      } catch (error) {
        fastify.log.error(
          `Error fetching data for chain ${chain}:`,
          error.message
        );
        reply
          .status(500)
          .send({ error: `Failed to fetch data for chain: ${chain}` });
      }
    }
  });
});
