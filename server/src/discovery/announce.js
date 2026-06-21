const os = require('os');
const { Bonjour } = require('bonjour-service');
const qrcode = require('qrcode-terminal');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const entry of iface) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    }
  }
  return '127.0.0.1';
}

function announce(port, name) {
  const ip = getLocalIp();
  const url = `http://${ip}:${port}`;

  const bonjour = new Bonjour();
  bonjour.publish({ name, type: 'http', port });

  console.log(`\nJoin Nexus at: ${url}`);
  console.log(`mDNS: http://${name}.local:${port}\n`);
  qrcode.generate(url, { small: true });
}

module.exports = { announce, getLocalIp };
