const fp = require('fastify-plugin');
const getTvl = require('../utils/get-tvl');

const routes = [
  {
    method: 'GET',
    url: '/tvl',
    handler: async (request, reply) => {
      const { chain } = request.server.opts || {};
      const tvl = await getTvl(chain);
      return tvl;
    }
  }
];

module.exports = fp(async (fastify, opts) => {
  if (!fastify.hasDecorator('opts')) {
    fastify.decorate('opts', opts);
  }
  routes.forEach((route) => {
    fastify.route(route);
  });
});
