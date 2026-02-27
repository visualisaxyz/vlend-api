const fp = require('fastify-plugin');
const getStabilityPoolOverview = require('../utils/get_stability_pool_overview');
const getStabilityPoolRewards = require('../utils/get_stability_pool_rewards');

// Export the routes as a plugin
module.exports = fp(async (fastify, opts) => {
  // Define routes with access to opts
  const routes = [
    {
      method: 'GET',
      url: '/stability_pool/overview',
      handler: async (request, reply) => {
        const overview = await getStabilityPoolOverview(opts.chain);
        return overview;
      }
    },
    {
      method: 'GET',
      url: '/stability_pool/rewards/:address',
      handler: async (request, reply) => {
        const overview = await getStabilityPoolRewards(
          request.params.address,
          opts.chain
        );
        return overview;
      }
    }
  ];

  // Register routes
  routes.forEach((route) => {
    fastify.route(route);
  });
});
