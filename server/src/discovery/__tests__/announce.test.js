const { getLocalIp } = require('../announce');

describe('getLocalIp', () => {
  test('returns a valid non-loopback IPv4 address', () => {
    const ip = getLocalIp();
    const ipv4Re = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

    expect(ipv4Re.test(ip)).toBe(true);
    expect(ip).not.toBe('127.0.0.1');
  });
});
