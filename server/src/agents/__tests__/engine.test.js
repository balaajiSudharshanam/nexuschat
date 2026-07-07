jest.mock('../../config', () => ({ ollamaBaseUrl: 'http://localhost:11434', model: 'test-model' }));
jest.mock('../tools', () => ({
  executeTool: jest.fn().mockResolvedValue('tool output'),
  listTools: jest.fn().mockReturnValue([]),
}));

const { runAgentTurn } = require('../engine');
const { listTools } = require('../tools');

// Every describe block below calls jest.resetAllMocks() in its own afterEach,
// which wipes listTools' mockReturnValue too — restore the default before each test.
beforeEach(() => {
  listTools.mockReturnValue([]);
});

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

  test('skips ragQuery for a substantive question when no docs are pinned', async () => {
    await runAgentTurn(
      { query: 'what does the Q3 report say about revenue?', agent: BASE_AGENT, history: [] },
      send, waitForApproval, ragQuery,
    );
    expect(ragQuery).not.toHaveBeenCalled();
  });

  test('calls ragQuery with all pinned docs for a substantive question', async () => {
    const agent = { ...BASE_AGENT, pinnedDocs: ['report.pdf', 'notes.pdf'] };
    await runAgentTurn(
      { query: 'what does the Q3 report say about revenue?', agent, history: [] },
      send, waitForApproval, ragQuery,
    );
    expect(ragQuery).toHaveBeenCalledWith('what does the Q3 report say about revenue?', ['report.pdf', 'notes.pdf']);
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

describe('runAgentTurn — tool awareness in system prompt', () => {
  let send;
  let waitForApproval;
  let ragQuery;

  beforeEach(() => {
    send = () => {};
    waitForApproval = jest.fn();
    ragQuery = jest.fn().mockResolvedValue([]);
  });

  afterEach(() => jest.resetAllMocks());

  test('system prompt tells the LLM which enabled tools exist and how to call them', async () => {
    listTools.mockReturnValue([
      { id: 'pdfMaker', description: 'Generate a PDF from a title and content string' },
    ]);

    let capturedBody;
    global.fetch = jest.fn().mockImplementation(async (_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return makeStream(['Sure, here is my answer.']);
    });

    const agent = { ...BASE_AGENT, enabledTools: ['pdfMaker'] };
    await runAgentTurn(
      { query: 'generate a pdf comparing them', agent, history: [] },
      send, waitForApproval, ragQuery,
    );

    const systemMessage = capturedBody.messages.find((m) => m.role === 'system');
    expect(systemMessage.content).toContain('pdfMaker');
    expect(systemMessage.content).toContain('Generate a PDF from a title and content string');
    expect(systemMessage.content).toContain('nexus_tool');
  });
});
