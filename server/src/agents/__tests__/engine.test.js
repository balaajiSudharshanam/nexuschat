jest.mock('../../config', () => ({ ollamaBaseUrl: 'http://localhost:11434', model: 'test-model' }));
jest.mock('../tools', () => ({
  executeTool: jest.fn().mockResolvedValue('tool output'),
  listTools: jest.fn().mockReturnValue([]),
}));

const { runAgentTurn } = require('../engine');

function makeStream(tokens) {
  const encoder = new TextEncoder();
  const lines = [
    ...tokens.map(token => JSON.stringify({ message: { content: token }, done: false })),
    JSON.stringify({ message: { content: '' }, done: true }),
  ];
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

const BASE_AGENT = {
  id: 'agent-1',
  name: 'Test Agent',
  description: 'A test agent',
  instructions: 'You are a helpful assistant.',
  pinnedDocs: [],
  enabledTools: [],
};

describe('runAgentTurn — conversational bypass', () => {
  let sent;
  let send;
  let waitForApproval;
  let ragQuery;

  beforeEach(() => {
    sent = [];
    send = (msg) => sent.push(msg);
    waitForApproval = jest.fn();
    ragQuery = jest.fn().mockResolvedValue([]);
    global.fetch = jest.fn().mockResolvedValue(makeStream(['Hello']));
  });

  afterEach(() => jest.resetAllMocks());

  test('skips ragQuery for a short greeting', async () => {
    await runAgentTurn(
      { query: 'hi', agent: BASE_AGENT, history: [] },
      send, waitForApproval, ragQuery,
    );
    expect(ragQuery).not.toHaveBeenCalled();
  });

  test('calls ragQuery for a substantive question', async () => {
    await runAgentTurn(
      { query: 'what does the Q3 report say about revenue?', agent: BASE_AGENT, history: [] },
      send, waitForApproval, ragQuery,
    );
    expect(ragQuery).toHaveBeenCalled();
  });
});

describe('runAgentTurn — Tool Call Tag detection', () => {
  let sent;
  let send;
  let waitForApproval;
  let ragQuery;

  beforeEach(() => {
    sent = [];
    send = (msg) => sent.push(msg);
    ragQuery = jest.fn().mockResolvedValue([]);
    global.fetch = jest.fn();
  });

  afterEach(() => jest.resetAllMocks());

  test('calls waitForApproval with tool name and args when LLM emits a tool tag', async () => {
    const toolResponse = '<nexus_tool>{"tool":"scraper","args":{"url":"https://example.com"}}</nexus_tool>';
    global.fetch
      .mockResolvedValueOnce(makeStream([toolResponse]))  // first call — tool tag
      .mockResolvedValueOnce(makeStream(['Done.']));       // second call — final response after tool

    waitForApproval = jest.fn().mockResolvedValue(false); // deny — simplest path

    await runAgentTurn(
      { query: 'scrape example.com', agent: { ...BASE_AGENT, enabledTools: ['scraper'] }, history: [] },
      send, waitForApproval, ragQuery,
    );

    expect(waitForApproval).toHaveBeenCalledWith('scraper', { url: 'https://example.com' });
  });

  test('sends agent_approval_request before waiting', async () => {
    const toolResponse = '<nexus_tool>{"tool":"scraper","args":{"url":"https://example.com"}}</nexus_tool>';
    global.fetch
      .mockResolvedValueOnce(makeStream([toolResponse]))
      .mockResolvedValueOnce(makeStream(['Done.']));

    waitForApproval = jest.fn().mockResolvedValue(false);

    await runAgentTurn(
      { query: 'scrape example.com', agent: { ...BASE_AGENT, enabledTools: ['scraper'] }, history: [] },
      send, waitForApproval, ragQuery,
    );

    const approvalReq = sent.find(m => m.type === 'agent_approval_request');
    expect(approvalReq).toMatchObject({ type: 'agent_approval_request', tool: 'scraper', args: { url: 'https://example.com' } });
  });
});

describe('runAgentTurn — approval granted', () => {
  let sent;
  let send;
  let ragQuery;

  beforeEach(() => {
    sent = [];
    send = (msg) => sent.push(msg);
    ragQuery = jest.fn().mockResolvedValue([]);
    global.fetch = jest.fn();
  });

  afterEach(() => jest.resetAllMocks());

  test('re-invokes Ollama after approval and streams final response', async () => {
    const toolResponse = '<nexus_tool>{"tool":"scraper","args":{"url":"https://example.com"}}</nexus_tool>';
    global.fetch
      .mockResolvedValueOnce(makeStream([toolResponse]))
      .mockResolvedValueOnce(makeStream(['Here is the summary.']));

    const waitForApproval = jest.fn().mockResolvedValue(true);

    await runAgentTurn(
      { query: 'scrape example.com', agent: { ...BASE_AGENT, enabledTools: ['scraper'] }, history: [] },
      send, waitForApproval, ragQuery,
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const tokenMsg = sent.find(m => m.type === 'agent_token');
    expect(tokenMsg.token).toBe('Here is the summary.');
  });

  test('denial skips second Ollama call — uses denial follow-up instead', async () => {
    const toolResponse = '<nexus_tool>{"tool":"scraper","args":{"url":"https://example.com"}}</nexus_tool>';
    global.fetch
      .mockResolvedValueOnce(makeStream([toolResponse]))
      .mockResolvedValueOnce(makeStream(['I cannot scrape without permission.']));

    const waitForApproval = jest.fn().mockResolvedValue(false);

    await runAgentTurn(
      { query: 'scrape example.com', agent: { ...BASE_AGENT, enabledTools: ['scraper'] }, history: [] },
      send, waitForApproval, ragQuery,
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const tokenMsg = sent.find(m => m.type === 'agent_token');
    expect(tokenMsg.token).toBe('I cannot scrape without permission.');
  });
});

describe('runAgentTurn — clean response (no tool tag)', () => {
  let sent;
  let send;
  let waitForApproval;
  let ragQuery;

  beforeEach(() => {
    sent = [];
    send = (msg) => sent.push(msg);
    waitForApproval = jest.fn();
    ragQuery = jest.fn().mockResolvedValue([]);
    global.fetch = jest.fn();
  });

  afterEach(() => jest.resetAllMocks());

  test('sends agent_token with full buffered response then agent_done', async () => {
    global.fetch.mockResolvedValue(makeStream(['Hello', ' world']));

    await runAgentTurn(
      { query: 'hi there', agent: BASE_AGENT, history: [] },
      send, waitForApproval, ragQuery,
    );

    const tokenMsg = sent.find(m => m.type === 'agent_token');
    expect(tokenMsg).toMatchObject({ type: 'agent_token', token: 'Hello world' });

    const doneMsg = sent.find(m => m.type === 'agent_done');
    expect(doneMsg).toBeDefined();
    expect(doneMsg.msgId).toBe(tokenMsg.msgId);
  });
});
