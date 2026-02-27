const fp = require('fastify-plugin');
const getYieldsOverview = require('../utils/get_yields_overview');

const routes = [
  {
    method: 'GET',
    url: '/yields/overview',
    handler: async (request, reply) => {
      const { chain } = request.server.opts || {};
      const overview = await getYieldsOverview(chain);
      return overview;
    }
  }
];
// Export the routes as a plugin
module.exports = fp(async (fastify, opts) => {
  routes.forEach((route, index) => {
    fastify.route(route);
  });
});