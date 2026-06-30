const { routeMessage } = require('../router');

function makeContext() {
  const ws = {};
  const clients = new Map();
  const broadcasts = [];
  const broadcast = (payload) => broadcasts.push(payload);
  const llmHandler = jest.fn();
  return { ws, clients, broadcast, broadcasts, llmHandler };
}

describe('Message Router', () => {
  test('join registers username in clients map and broadcasts join event', async () => {
    const { ws, clients, broadcast, broadcasts } = makeContext();

    await routeMessage({ type: 'join', username: 'Alice' }, ws, clients, broadcast);

    expect(clients.get(ws)).toEqual({ username: 'Alice' });
    expect(broadcasts).toEqual([{ type: 'join', username: 'Alice' }]);
  });

  test('plain message broadcasts to all clients with username, text, threadId and ts', async () => {
    const { ws, clients, broadcast, broadcasts, llmHandler } = makeContext();

    await routeMessage(
      { type: 'message', username: 'Alice', text: 'hello', threadId: null },
      ws, clients, broadcast, llmHandler
    );

    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchObject({ type: 'message', username: 'Alice', text: 'hello', threadId: null });
    expect(typeof broadcasts[0].ts).toBe('number');
    expect(llmHandler).not.toHaveBeenCalled();
  });

  test('@llm mention broadcasts original message then llm_start, calls llmHandler with query and no docName', async () => {
    const { ws, clients, broadcast, broadcasts, llmHandler } = makeContext();

    await routeMessage(
      { type: 'message', username: 'Alice', text: '@llm what is the capital of France?' },
      ws, clients, broadcast, llmHandler
    );

    expect(broadcasts[0]).toMatchObject({ type: 'message', username: 'Alice' });
    expect(broadcasts[1]).toMatchObject({
      type: 'llm_start',
      username: 'Alice',
      query: 'what is the capital of France?',
      docName: null,
    });
    expect(llmHandler).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'what is the capital of France?', docName: null, threadId: undefined }),
      broadcast
    );
  });

  test('@llm /doc:report.pdf extracts docName and passes it to llmHandler', async () => {
    const { ws, clients, broadcast, broadcasts, llmHandler } = makeContext();

    await routeMessage(
      { type: 'message', username: 'Bob', text: '@llm /doc:report.pdf summarise the findings' },
      ws, clients, broadcast, llmHandler
    );

    expect(broadcasts[1]).toMatchObject({ type: 'llm_start', docName: 'report.pdf', query: 'summarise the findings' });
    expect(llmHandler).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'summarise the findings', docName: 'report.pdf', threadId: undefined }),
      broadcast
    );
  });

  test('unknown message type broadcasts nothing and does not call llmHandler', async () => {
    const { ws, clients, broadcast, broadcasts, llmHandler } = makeContext();

    await routeMessage({ type: 'ping' }, ws, clients, broadcast, llmHandler);

    expect(broadcasts).toHaveLength(0);
    expect(llmHandler).not.toHaveBeenCalled();
  });
});
