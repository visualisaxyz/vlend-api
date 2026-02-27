const fp = require('fastify-plugin');
// Define routes
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const config = require('../utils/config');
const { uuid } = require('uuidv4');
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

const routes = [
  {
    method: 'GET',
    url: '/whitelist/add',
    handler: async (request, reply) => {

      // get referer and address from the query string
      const { referer, address } = request.query;

      // check if not empty
      if (!referer || !address) {
        return { error: "Invalid parameters" };
      }

      // check if address is a valid ethereum address
      if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        return { error: "Invalid address" };
      }

      const result = await supabase.from("referers").insert({
        referer,
        address
      });

      if (result.error) {
        return { error: result.error.message };
      }


      return { error: null };

  
    }
  },
  {
    method: 'GET',
    url: '/whitelist/gen',
    handler: async (request, reply) => {

      // get referer and address from the query string
      const { referer } = request.query;

      // generate a short UUID for the referer

      const uniqueId = uuid().substring(0, 8);

      // check if address is a valid ethereum address
      if (!referer.match(/^0x[a-fA-F0-9]{40}$/)) {
        return { error: "Invalid address" };
      }

      // check if referer already exists

      const result = await supabase.from("walletToReferer").select("*").eq("walletAddress", referer);

      // if exists, return the existing referer

      if (result.data.length > 0) {
        return { referer: result.data[0].uniqueId };
      } else {
        // if not, insert the new referer

        const result = await supabase.from("walletToReferer").insert({
          uniqueId,
          walletAddress: referer
        });

        if (result.error) {
          return { error: result.error.message };
        }

        return { referer: uniqueId };
      }

      if (result.error) {
        return { error: result.error.message };
      }

    }
  },
  {
    method: 'GET',
    url: '/whitelist/count',
    handler: async (request, reply) => {

      // get referer and address from the query string
      const { referer } = request.query;

      // check if not empty
      if (!referer) {
        return { error: "Invalid parameters" };
      }

      // check if address is a valid ethereum address
      if (!referer.match(/^0x[a-fA-F0-9]{40}$/)) {
        return { error: "Invalid address" };
      }

      const result = await supabase.from("walletToReferer").select("*").eq("walletAddress", referer);

      if (result.error) {
        return { error: result.error.message };
      }

      // get the uniqueId
      if (result.data.length > 0) {
        const uniqueId = result.data[0].uniqueId;

        // get the count
        const count = await supabase.from("referers").select("*").eq("referer", uniqueId);

        if (count.error) {
          return { error: count.error.message };
        }

        return { count: count.data.length };
      } else {
        return { count: 0 };
      }
    }
  }
];

// Export the routes as a plugin
module.exports = fp(async (fastify, opts) => {
  routes.forEach((route, index) => {
    fastify.route(route);
  });
});
