const fp = require('fastify-plugin');
const { getVLENDPrice, getVUSDPrice } = require('../utils/prices');

const routes = [
  {
    method: 'GET',
    url: '/prices',
    handler: async (request, reply) => {
      const [VLEND, vUSD] = await Promise.all([
        getVLENDPrice(),
        getVUSDPrice()
      ]);

      return {
        VLEND,
        vUSD,
        VLEND_all: { VLEND },
        vUSD_all: { vUSD }
      };
    }
  }
];

module.exports = fp(async (fastify, opts) => {
  routes.forEach((route) => {
    fastify.route(route);
  });
});
