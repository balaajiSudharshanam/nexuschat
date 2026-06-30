const fs = require('fs');
const config = require('./config');
const { app, httpServer } = require('./app');
const { initWsServer } = require('./ws/server');
const { announce } = require('./discovery/announce');
const { loadDocs } = require('./rag/store');

fs.mkdirSync(config.dataDir, { recursive: true });

initWsServer(httpServer);

const { broadcast } = require('./ws/server');
require('./routes/docs').setBroadcast(broadcast);

loadDocs().then(() => {
  httpServer.listen(config.port, () => {
    console.log(`Nexus running on port ${config.port}`);
    announce(config.port);
  });

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[startup] Port ${config.port} is already in use. Stop the existing process and retry.`);
    } else {
      console.error('[startup] Server error:', err.message);
    }
    process.exit(1);
  });
}).catch(err => {
  console.error('[startup] Failed to load docs from disk:', err.message);
  process.exit(1);
});
