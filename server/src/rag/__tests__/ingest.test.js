const { chunkText } = require('../ingest');

describe('chunkText', () => {
  test('empty string returns empty array', () => {
    expect(chunkText('')).toEqual([]);
  });

  test('text shorter than CHUNK_SIZE returns a single chunk containing all words', () => {
    const words = Array.from({ length: 10 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const chunks = chunkText(text);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  test('text longer than CHUNK_SIZE is split into multiple chunks', () => {
    const words = Array.from({ length: 600 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  test('each chunk contains at most CHUNK_SIZE (500) words', () => {
    const words = Array.from({ length: 1200 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      const wordCount = chunk.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(500);
    }
  });

  test('consecutive chunks overlap by CHUNK_OVERLAP (50) words', () => {
    const words = Array.from({ length: 600 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const chunks = chunkText(text);

    // The last 50 words of chunk N should equal the first 50 words of chunk N+1
    for (let n = 0; n < chunks.length - 1; n++) {
      const chunkWords = chunks[n].split(/\s+/);
      const nextChunkWords = chunks[n + 1].split(/\s+/);
      const tailOfCurrent = chunkWords.slice(-50);
      const headOfNext = nextChunkWords.slice(0, 50);
      expect(tailOfCurrent).toEqual(headOfNext);
    }
  });
});
