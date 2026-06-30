const os = require('os');
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

function announce(port) {
  const ip = getLocalIp();
  const url = `http://${ip}:${port}`;
  console.log(`\nJoin Nexus at: ${url}\n`);
  qrcode.generate(url, { small: true });
}

module.exports = { announce, getLocalIp };
