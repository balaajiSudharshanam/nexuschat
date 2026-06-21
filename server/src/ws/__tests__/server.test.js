const { handleDisconnect } = require('../server');

function makeContext(username = null) {
  const ws = {};
  const clients = new Map([[ws, { username }]]);
  const broadcasts = [];
  const broadcast = (payload) => broadcasts.push(payload);
  return { ws, clients, broadcast, broadcasts };
}

describe('handleDisconnect', () => {
  test('named client disconnect removes client and broadcasts leave event', () => {
    const { ws, clients, broadcast, broadcasts } = makeContext('Alice');

    handleDisconnect(ws, clients, broadcast);

    expect(clients.has(ws)).toBe(false);
    expect(broadcasts).toEqual([{ type: 'leave', username: 'Alice' }]);
  });

  test('unnamed client disconnect removes client and broadcasts nothing', () => {
    const { ws, clients, broadcast, broadcasts } = makeContext(null);

    handleDisconnect(ws, clients, broadcast);

    expect(clients.has(ws)).toBe(false);
    expect(broadcasts).toHaveLength(0);
  });
});
