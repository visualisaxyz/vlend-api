const fp = require('fastify-plugin');
const getCollaterals = require('../utils/get_collaterals');
const getCollateralPrice = require('../utils/get_collateral_price');

// Define routes
const routes = [
  {
    method: 'GET',
    url: '/collaterals',
    handler: async (request, reply) => {
      try {
        const { chain } = request.server.opts;
        console.log('Debug - Chain value in route:', chain);

        if (!chain) {
          throw new Error('Chain parameter is missing in server options');
        }

        const collateralData = await getCollaterals(chain);

        if (!collateralData || !Array.isArray(collateralData)) {
          throw new Error('Invalid collateral data received');
        }

        collateralData.forEach((token) => {
          token.price = `/collaterals/price/${token.address}`;
        });

        return collateralData;
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({
          error: 'Failed to fetch collaterals',
          details: error.message
        });
      }
    }
  },
  {
    method: 'GET',
    url: '/collaterals/price/:address',
    handler: async (request, reply) => {
      try {
        const { chain } = request.server.opts;
        const { address } = request.params;

        console.log('Debug - Price route chain value:', chain);
        console.log('Debug - Price route address:', address);
        console.log('Debug - Price route server opts:', request.server.opts);

        if (!chain) {
          throw new Error('Chain parameter is missing in server options');
        }

        if (!address) {
          throw new Error('Token address is required');
        }

        const price = await getCollateralPrice(address, chain);
        return price;
      } catch (error) {
        request.log.error('Error in price route:', error);

        // Check if it's a price-not-available error
        if (
          error.message &&
          error.message.includes('Price feed is not currently available')
        ) {
          reply.status(503).send({
            error: 'Price feed unavailable',
            details: error.message
          });
        } else {
          reply.status(500).send({
            error: 'Failed to fetch collateral price',
            details: error.message
          });
        }
      }
    }
  }
];

// Export the routes as a plugin
module.exports = fp(async (fastify, opts) => {
  // Make sure opts.chain exists
  if (!opts.chain) {
    throw new Error('Chain parameter is required in plugin options');
  }

  if (!fastify.hasDecorator('opts')) {
    fastify.decorate('opts', opts);
  }
  routes.forEach((route) => {
    fastify.route(route);
  });
});
