jest.mock('../../agents/engine', () => ({ runAgentTurn: jest.fn() }));
jest.mock('../../agents/store', () => ({ getAgent: jest.fn() }));
jest.mock('../../rag/query', () => ({ queryRag: jest.fn() }));

const { handleDisconnect } = require('../server');

function makeContext(username = null) {
  const ws = {};
  const clients = new Map([[ws, { username }]]);
  const sessions = new Map();
  const broadcasts = [];
  const broadcast = (payload) => broadcasts.push(payload);
  return { ws, clients, sessions, broadcasts, broadcast };
}

describe('handleDisconnect', () => {
  test('named client disconnect removes client and broadcasts leave event', () => {
    const { ws, clients, sessions, broadcast, broadcasts } = makeContext('Alice');

    handleDisconnect(ws, clients, sessions, broadcast);

    expect(clients.has(ws)).toBe(false);
    expect(broadcasts).toEqual([{ type: 'leave', username: 'Alice' }]);
  });

  test('unnamed client disconnect removes client and broadcasts nothing', () => {
    const { ws, clients, sessions, broadcast, broadcasts } = makeContext(null);

    handleDisconnect(ws, clients, sessions, broadcast);

    expect(clients.has(ws)).toBe(false);
    expect(broadcasts).toHaveLength(0);
  });
});
