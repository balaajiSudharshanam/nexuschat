const fs = require('fs');
const config = require('./config');
const { app, httpServer } = require('./app');
const { initWsServer } = require('./ws/server');
const { announce } = require('./discovery/announce');

fs.mkdirSync(config.dataDir, { recursive: true });

initWsServer(httpServer);

const { broadcast } = require('./ws/server');
require('./routes/docs').setBroadcast(broadcast);

httpServer.listen(config.port, () => {
  console.log(`Nexus running on port ${config.port}`);
  announce(config.port, config.bonjourName);
});
