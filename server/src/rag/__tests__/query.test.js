'use strict';

jest.mock('../../llm/ollama', () => ({ embed: jest.fn() }));
jest.mock('../store', () => ({ searchIndex: jest.fn(), listDocs: jest.fn() }));

const { embed } = require('../../llm/ollama');
const { searchIndex, listDocs } = require('../store');
const { queryRag } = require('../query');

describe('queryRag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    embed.mockResolvedValue([0.1, 0.2]);
  });

  test('returns searchIndex result when docName exists in listDocs', async () => {
    listDocs.mockResolvedValue(['report.pdf', 'notes.pdf']);
    searchIndex.mockResolvedValue([{ text: 'chunk1', score: 0.9 }]);

    const result = await queryRag('what is revenue?', 'report.pdf');

    expect(searchIndex).toHaveBeenCalledWith('report.pdf', [0.1, 0.2]);
    expect(result).toEqual([{ text: 'chunk1', score: 0.9 }]);
  });

  test('merges and sorts results by score descending when docName is null', async () => {
    listDocs.mockResolvedValue(['doc1.pdf', 'doc2.pdf']);
    searchIndex
      .mockResolvedValueOnce([{ text: 'low', score: 0.3 }])
      .mockResolvedValueOnce([{ text: 'high', score: 0.8 }]);

    const result = await queryRag('some query', null);

    expect(searchIndex).toHaveBeenCalledTimes(2);
    expect(result[0].score).toBeGreaterThan(result[1].score);
    expect(result[0].text).toBe('high');
    expect(result[1].text).toBe('low');
  });

  test('returns null when docName is not in listDocs', async () => {
    listDocs.mockResolvedValue(['report.pdf', 'notes.pdf']);

    const result = await queryRag('some query', 'missing.pdf');

    expect(searchIndex).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('returns empty array when no docs exist and docName is null', async () => {
    listDocs.mockResolvedValue([]);

    const result = await queryRag('some query', null);

    expect(searchIndex).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
