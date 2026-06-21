'use strict';

const { handleLlmMention } = require('../ollama');

function makeStream(lines) {
  const encoder = new TextEncoder();
  return {
    body: {
      getReader: () => {
        let i = 0;
        return {
          read: async () => {
            if (i >= lines.length) return { done: true };
            return { done: false, value: encoder.encode(lines[i++] + '\n') };
          },
        };
      },
    },
  };
}

describe('handleLlmMention', () => {
  let broadcast;
  let broadcasts;
  let fetchSpy;

  beforeEach(() => {
    broadcasts = [];
    broadcast = (payload) => broadcasts.push(payload);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  test('streams llm_token events to broadcast for each token chunk', async () => {
    const lines = [
      JSON.stringify({ message: { content: 'Hello' }, done: false }),
      JSON.stringify({ message: { content: ' world' }, done: false }),
      JSON.stringify({ message: { content: '' }, done: true }),
    ];
    fetchSpy.mockResolvedValue(makeStream(lines));

    const ragQuery = jest.fn().mockResolvedValue([]);
    await handleLlmMention({ query: 'hi', docName: null, threadId: 'thread-1' }, broadcast, ragQuery);

    const tokenEvents = broadcasts.filter((b) => b.type === 'llm_token');
    expect(tokenEvents).toEqual([
      { type: 'llm_token', token: 'Hello', threadId: 'thread-1' },
      { type: 'llm_token', token: ' world', threadId: 'thread-1' },
    ]);
  });
});
