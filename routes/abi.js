const fp = require('fastify-plugin');
const getAbiList = require('../utils/get_abi_list');
const getAbi = require('../utils/get_abi');

// Define routes
const routes = [
  {
    method: 'GET',
    url: '/abi/list',
    handler: async (request, reply) => {
      const { chain } = request.server.opts || {};
      console.log('Debug - ABI list route chain:', chain);
      const abiList = await getAbiList(chain);
      return abiList;
    }
  },
  {
    method: 'GET',
    url: '/abi/:filename',
    handler: async (request, reply) => {
      const { chain } = request.server.opts || {};
      console.log('Debug - ABI fetch route:', {
        chain,
        filename: request.params.filename
      });
      const abi = await getAbi(request.params.filename, chain);
      return abi;
    }
  }
];

// Export the routes as a plugin
module.exports = fp(
  async (fastify, opts) => {
    console.log('Debug - ABI plugin options:', opts);

    if (!fastify.hasDecorator('opts')) {
      fastify.decorate('opts', opts);
    }

    routes.forEach((route) => {
      fastify.route(route);
    });
  },
  {
    name: 'abi-routes'
  }
);
