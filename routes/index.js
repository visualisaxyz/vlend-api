// routes/index.js

// Import required modules
const fp = require('fastify-plugin');

// Define routes
const routes = [
  {
    method: 'GET',
    url: '/',
    handler: async (request, reply) => {
      return [
        '/chain',
        '/abi/list',
        '/collaterals',
        '/vaults',
        '/vaults/:address',
        '/vaultsByUser/:address',
        '/vaultsByCollateral/:address',
        '/redeemableVaults',
        '/liquidatableVaults',
        '/protocolStats',
        '/vlend_staking/overview',
        '/stability_pool/overview',
        '/stability_pool/rewards/:address',
        '/yields/overview',
        '/prices',
        '/tvl'
      ];
    }
  }
];

// Export the routes as a plugin
module.exports = fp(async (fastify, opts) => {
  routes.forEach((route, index) => {
    fastify.route(route);
  });
});
