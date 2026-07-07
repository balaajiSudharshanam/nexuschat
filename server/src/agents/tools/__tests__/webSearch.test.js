'use strict';

jest.mock('../../../config', () => ({ serperApiKey: 'test-key' }));
jest.mock('../../../rag/ingest', () => ({ chunkText: jest.fn((text) => [text]) }));
jest.mock('../../../rag/grader', () => ({ gradeAll: jest.fn() }));
jest.mock('playwright', () => ({ chromium: { launch: jest.fn() } }));

const config = require('../../../config');
const { chunkText } = require('../../../rag/ingest');
const { gradeAll } = require('../../../rag/grader');
const { chromium } = require('playwright');
const webSearch = require('../webSearch');

function makePage(overrides = {}) {
  return {
    goto: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue('page text'),
    close: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeBrowser(pages) {
  let i = 0;
  return {
    newPage: jest.fn(async () => pages[i++] ?? makePage()),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

describe('webSearch tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.serperApiKey = 'test-key';
    chunkText.mockImplementation((text) => [text]);
    gradeAll.mockImplementation((chunks) => chunks.map((c) => ({ ...c, graderScore: 5 })));
  });

  test('throws when no url given and SERPER_API_KEY is not configured', async () => {
    config.serperApiKey = '';
    await expect(webSearch.run({ query: 'anything' })).rejects.toThrow('SERPER_API_KEY');
  });

  test('searches, scrapes, chunks, and grades results for a query', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        organic: [
          { link: 'https://a.example.com' },
          { link: 'https://b.example.com' },
        ],
      }),
    });

    const pageA = makePage({ evaluate: jest.fn().mockResolvedValue('content A') });
    const pageB = makePage({ evaluate: jest.fn().mockResolvedValue('content B') });
    const browser = makeBrowser([pageA, pageB]);
    chromium.launch.mockResolvedValue(browser);

    const result = await webSearch.run({ query: 'what is nexus' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://google.serper.dev/search',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-API-KEY': 'test-key' }) }),
    );
    expect(pageA.goto).toHaveBeenCalledWith('https://a.example.com', expect.any(Object));
    expect(pageB.goto).toHaveBeenCalledWith('https://b.example.com', expect.any(Object));
    expect(gradeAll).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ text: 'content A', source: 'https://a.example.com' }),
        expect.objectContaining({ text: 'content B', source: 'https://b.example.com' }),
      ]),
      'what is nexus',
    );
    expect(result).toContain('[Source: https://a.example.com]');
    expect(result).toContain('content A');
    expect(browser.close).toHaveBeenCalled();
  });

  test('skips search and grading when a direct url is given with no query', async () => {
    const page = makePage({ evaluate: jest.fn().mockResolvedValue('raw page text') });
    const browser = makeBrowser([page]);
    chromium.launch.mockResolvedValue(browser);
    global.fetch = jest.fn();

    const result = await webSearch.run({ url: 'https://known.example.com' });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(gradeAll).not.toHaveBeenCalled();
    expect(result).toBe('raw page text');
  });

  test('continues when one of several pages fails to scrape', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        organic: [{ link: 'https://good.example.com' }, { link: 'https://bad.example.com' }],
      }),
    });

    const goodPage = makePage({ evaluate: jest.fn().mockResolvedValue('good content') });
    const badPage = makePage({ goto: jest.fn().mockRejectedValue(new Error('timeout')) });
    const browser = makeBrowser([goodPage, badPage]);
    chromium.launch.mockResolvedValue(browser);

    const result = await webSearch.run({ query: 'test' });

    expect(result).toContain('good content');
    expect(gradeAll).toHaveBeenCalledWith(
      [expect.objectContaining({ source: 'https://good.example.com' })],
      'test',
    );
  });

  test('returns a message when search yields no results', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ organic: [] }) });

    const result = await webSearch.run({ query: 'obscure query' });

    expect(result).toBe('No search results found.');
    expect(chromium.launch).not.toHaveBeenCalled();
  });

  test('returns a message when nothing passes the grader', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ organic: [{ link: 'https://a.example.com' }] }),
    });
    const browser = makeBrowser([makePage()]);
    chromium.launch.mockResolvedValue(browser);
    gradeAll.mockResolvedValue([]);

    const result = await webSearch.run({ query: 'irrelevant' });

    expect(result).toBe('No relevant content found in search results.');
  });
});
