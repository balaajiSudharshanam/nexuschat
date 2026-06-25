jest.mock('../../config', () => ({ ollamaBaseUrl: 'http://localhost:11434', model: 'test-model' }));

const { gradeAll } = require('../grader');

// Builds a minimal fetch response that Ollama would return for a given content string
function ollamaResponse(content) {
  return Promise.resolve({
    json: () => Promise.resolve({ message: { content } }),
  });
}

function makeChunk(text, source) {
  return { text, source };
}

const RESUME_CHUNK = makeChunk(
  'John Doe — Software Engineer. 5 years experience in React and Node.js. Previously at TechCorp.',
  'resume.pdf'
);

const FLIGHT_CHUNK = makeChunk(
  'Flight AA123 departs JFK at 08:00. Seat 14A. Baggage allowance: 2 checked bags.',
  'flight-ticket.pdf'
);

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Score filtering
// ---------------------------------------------------------------------------

describe('gradeAll — score filtering', () => {
  test('rejects a chunk that scores exactly 3 (below threshold)', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('3'));
    const results = await gradeAll([RESUME_CHUNK], 'What is the candidate experience?');
    expect(results).toHaveLength(0);
  });

  test('rejects chunks scoring 1 or 2', async () => {
    global.fetch
      .mockResolvedValueOnce(ollamaResponse('1'))
      .mockResolvedValueOnce(ollamaResponse('2'));
    const results = await gradeAll([RESUME_CHUNK, FLIGHT_CHUNK], 'any query');
    expect(results).toHaveLength(0);
  });

  test('accepts a chunk that scores exactly 4', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('4'));
    const results = await gradeAll([RESUME_CHUNK], 'What is the candidate experience?');
    expect(results).toHaveLength(1);
    expect(results[0].graderScore).toBe(4);
  });

  test('accepts a chunk that scores 5', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('5'));
    const results = await gradeAll([RESUME_CHUNK], 'any query');
    expect(results).toHaveLength(1);
    expect(results[0].graderScore).toBe(5);
  });

  test('sorts multiple passing chunks by score descending', async () => {
    global.fetch
      .mockResolvedValueOnce(ollamaResponse('4'))
      .mockResolvedValueOnce(ollamaResponse('5'));
    const results = await gradeAll([RESUME_CHUNK, FLIGHT_CHUNK], 'any query');
    expect(results[0].graderScore).toBe(5);
    expect(results[1].graderScore).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Empty / no-fallback behaviour
// ---------------------------------------------------------------------------

describe('gradeAll — no fallback when threshold not met', () => {
  test('returns empty array when all chunks score below 4', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('2'));
    const results = await gradeAll([RESUME_CHUNK, FLIGHT_CHUNK], 'unrelated query');
    expect(results).toEqual([]);
  });

  test('empty array is not a forced low-quality fallback — length is exactly 0', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('1'));
    const results = await gradeAll([RESUME_CHUNK], 'unrelated query');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  test('returns empty array immediately for empty input without calling Ollama', async () => {
    const results = await gradeAll([], 'any query');
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Invalid / malformed responses → null score
// ---------------------------------------------------------------------------

describe('gradeOne — invalid responses return null (excluded, not forced)', () => {
  test('excludes chunk when Ollama returns a word instead of a digit', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('yes'));
    const results = await gradeAll([RESUME_CHUNK], 'query');
    expect(results).toHaveLength(0);
  });

  test('excludes chunk when Ollama returns an empty string', async () => {
    global.fetch.mockResolvedValue(ollamaResponse(''));
    const results = await gradeAll([RESUME_CHUNK], 'query');
    expect(results).toHaveLength(0);
  });

  test('excludes chunk when Ollama returns a score out of range (6)', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('6'));
    const results = await gradeAll([RESUME_CHUNK], 'query');
    expect(results).toHaveLength(0);
  });

  test('excludes chunk when Ollama returns 0 (below minimum)', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('0'));
    const results = await gradeAll([RESUME_CHUNK], 'query');
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

describe('gradeOne — retry on malformed responses', () => {
  test('retries and succeeds on the third attempt', async () => {
    global.fetch
      .mockResolvedValueOnce(ollamaResponse('maybe'))  // attempt 0 — invalid
      .mockResolvedValueOnce(ollamaResponse(''))        // attempt 1 — invalid
      .mockResolvedValueOnce(ollamaResponse('4'));       // attempt 2 — valid

    const results = await gradeAll([RESUME_CHUNK], 'query');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(1);
    expect(results[0].graderScore).toBe(4);
  });

  test('makes exactly 3 fetch calls (initial + 2 retries) before giving up', async () => {
    // MAX_RETRIES = 2: attempt 0, 1, 2 → all invalid → null
    global.fetch.mockResolvedValue(ollamaResponse('not-a-number'));
    const results = await gradeAll([RESUME_CHUNK], 'query');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(0);
  });

  test('succeeds on the first retry without unnecessary extra calls', async () => {
    global.fetch
      .mockResolvedValueOnce(ollamaResponse('bad'))  // attempt 0 — invalid
      .mockResolvedValueOnce(ollamaResponse('5'));    // attempt 1 — valid

    const results = await gradeAll([RESUME_CHUNK], 'query');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(results[0].graderScore).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Cross-document independence: resume vs flight ticket
// ---------------------------------------------------------------------------

describe('gradeAll — resume and flight ticket chunks graded independently', () => {
  test('resume passes, flight ticket is rejected when scores differ', async () => {
    global.fetch
      .mockResolvedValueOnce(ollamaResponse('4'))  // resume — passes
      .mockResolvedValueOnce(ollamaResponse('2')); // flight ticket — rejected

    const results = await gradeAll([RESUME_CHUNK, FLIGHT_CHUNK], 'What is the candidate experience?');
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('resume.pdf');
  });

  test('flight ticket passes, resume is rejected when scores differ', async () => {
    global.fetch
      .mockResolvedValueOnce(ollamaResponse('1'))  // resume — irrelevant
      .mockResolvedValueOnce(ollamaResponse('5')); // flight ticket — directly relevant

    const results = await gradeAll([RESUME_CHUNK, FLIGHT_CHUNK], 'What time does the flight depart?');
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('flight-ticket.pdf');
    expect(results[0].graderScore).toBe(5);
  });

  test('each chunk receives its own independent Ollama API call', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('4'));
    await gradeAll([RESUME_CHUNK, FLIGHT_CHUNK], 'query');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('both chunks pass when both score above threshold', async () => {
    global.fetch
      .mockResolvedValueOnce(ollamaResponse('4'))
      .mockResolvedValueOnce(ollamaResponse('5'));

    const results = await gradeAll([RESUME_CHUNK, FLIGHT_CHUNK], 'query');
    expect(results).toHaveLength(2);
    expect(results.map(r => r.source)).toContain('resume.pdf');
    expect(results.map(r => r.source)).toContain('flight-ticket.pdf');
  });

  test('both chunks are rejected when both score below threshold', async () => {
    global.fetch
      .mockResolvedValueOnce(ollamaResponse('2'))
      .mockResolvedValueOnce(ollamaResponse('3'));

    const results = await gradeAll([RESUME_CHUNK, FLIGHT_CHUNK], 'query');
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// graderScore and metadata pass-through
// ---------------------------------------------------------------------------

describe('gradeAll — graderScore and chunk metadata', () => {
  test('attaches graderScore to each passing chunk', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('5'));
    const results = await gradeAll([RESUME_CHUNK], 'query');
    expect(results[0]).toMatchObject({
      text: RESUME_CHUNK.text,
      source: RESUME_CHUNK.source,
      graderScore: 5,
    });
  });

  test('preserves source field on passing chunks', async () => {
    global.fetch
      .mockResolvedValueOnce(ollamaResponse('4'))
      .mockResolvedValueOnce(ollamaResponse('5'));

    const results = await gradeAll([RESUME_CHUNK, FLIGHT_CHUNK], 'query');
    const sources = results.map(r => r.source);
    expect(sources).toContain('resume.pdf');
    expect(sources).toContain('flight-ticket.pdf');
  });

  test('does not add graderScore to rejected chunks (they are not in results)', async () => {
    global.fetch.mockResolvedValue(ollamaResponse('2'));
    const results = await gradeAll([RESUME_CHUNK], 'query');
    // The chunk should be absent entirely — not present with a score attached
    expect(results.find(r => r.source === 'resume.pdf')).toBeUndefined();
  });
});
