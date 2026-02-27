// Import required modules
const fastify = require('fastify');
const cors = require('fastify-cors');
require('dotenv').config();

// Initialize Fastify servers
const mainnetServer = fastify({
  logger: true
});

// Register CORS for the server
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ['https://vlend.visualisa.xyz'];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

mainnetServer.register(cors, corsOptions);

// Import routes
const routes = [
  require('./routes/index'),
  require('./routes/chain'),
  require('./routes/abi'),
  require('./routes/collaterals'),
  require('./routes/vaults'),
  require('./routes/vaults_overview'),
  require('./routes/protocol_stats'),
  require('./routes/vlend_staking'),
  require('./routes/stability_pool'),
  require('./routes/prices'),
  require('./routes/whitelist'),
  require('./routes/yields'),
  require('./routes/tvl')
];

// Register routes for the server
routes.forEach((route) => {
  route(mainnetServer, { chain: 'megaeth' });
});

// Run the server
const startServer = async () => {
  try {
    // Start Mainnet server on HTTP
    const port = process.env.PORT || 3000;
    await mainnetServer.listen({
      host: '0.0.0.0',
      port
    });
    mainnetServer.log.info(
      `vLend API (MegaETH) running at http://127.0.0.1:${port}`
    );
  } catch (err) {
    mainnetServer.log.error(err);
    process.exit(1);
  }
};

startServer();
