'use strict';

jest.mock('../../llm/ollama', () => ({ embed: jest.fn() }));
jest.mock('../store', () => ({ searchIndex: jest.fn(), listDocs: jest.fn(), getTextChunks: jest.fn().mockReturnValue([]) }));
jest.mock('../grader', () => ({ gradeAll: jest.fn() }));

const { embed } = require('../../llm/ollama');
const { searchIndex, listDocs } = require('../store');
const { gradeAll } = require('../grader');
const { queryRag } = require('../query');

describe('queryRag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    embed.mockResolvedValue([0.1, 0.2]);
    // Default: grader passes every candidate through, scored by its RRF score.
    gradeAll.mockImplementation(chunks => chunks.map(c => ({ ...c, graderScore: c.score })));
  });

  test('returns searchIndex result when docName exists in listDocs', async () => {
    listDocs.mockResolvedValue(['report.pdf', 'notes.pdf']);
    searchIndex.mockResolvedValue([{ text: 'chunk1', score: 0.9 }]);

    const result = await queryRag('what is revenue?', 'report.pdf');

    expect(searchIndex).toHaveBeenCalledWith('report.pdf', [0.1, 0.2], 10);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ text: 'chunk1', source: 'report.pdf' });
  });

  test('sorts merged results by graderScore descending across documents', async () => {
    listDocs.mockResolvedValue(['doc1.pdf', 'doc2.pdf']);
    searchIndex
      .mockResolvedValueOnce([{ text: 'low', score: 0.3 }])
      .mockResolvedValueOnce([{ text: 'high', score: 0.8 }]);
    // Independent of RRF score — the grader is what actually judges relevance.
    gradeAll.mockImplementation(chunks => chunks.map(c => ({ ...c, graderScore: c.text === 'high' ? 5 : 2 })));

    const result = await queryRag('some query', null);

    expect(searchIndex).toHaveBeenCalledTimes(2);
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

  test('searches only the docs listed when docTarget is an array', async () => {
    listDocs.mockResolvedValue(['report.pdf', 'notes.pdf', 'other.pdf']);
    searchIndex
      .mockResolvedValueOnce([{ text: 'from report', score: 0.9 }])
      .mockResolvedValueOnce([{ text: 'from notes', score: 0.7 }]);

    const result = await queryRag('some query', ['report.pdf', 'notes.pdf']);

    expect(searchIndex).toHaveBeenCalledTimes(2);
    expect(searchIndex).toHaveBeenCalledWith('report.pdf', [0.1, 0.2], 10);
    expect(searchIndex).toHaveBeenCalledWith('notes.pdf', [0.1, 0.2], 10);
    expect(result.map(r => r.text).sort()).toEqual(['from notes', 'from report']);
  });

  test('drops array entries that do not exist in listDocs', async () => {
    listDocs.mockResolvedValue(['report.pdf']);
    searchIndex.mockResolvedValue([{ text: 'chunk1', score: 0.9 }]);

    const result = await queryRag('some query', ['report.pdf', 'missing.pdf']);

    expect(searchIndex).toHaveBeenCalledTimes(1);
    expect(searchIndex).toHaveBeenCalledWith('report.pdf', [0.1, 0.2], 10);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ text: 'chunk1', source: 'report.pdf' });
  });
});
