const { loadConfig } = require('../config');

describe('loadConfig', () => {
  test('returns all defaults when no env vars are set', () => {
    const config = loadConfig({});

    expect(config).toEqual({
      model: 'llama3.2',
      embedModel: 'nomic-embed-text',
      port: 3000,
      dataDir: './data',
      ollamaBaseUrl: 'http://localhost:11434',
    });
  });

  test('reads MODEL, SERVER_PORT, EMBED_MODEL, DATA_DIR, OLLAMA_BASE_URL from env', () => {
    const config = loadConfig({
      MODEL: 'mistral',
      SERVER_PORT: '8080',
      EMBED_MODEL: 'mxbai-embed-large',
      DATA_DIR: '/tmp/data',
      OLLAMA_BASE_URL: 'http://192.168.1.5:11434',
    });

    expect(config.model).toBe('mistral');
    expect(config.port).toBe(8080);
    expect(config.embedModel).toBe('mxbai-embed-large');
    expect(config.dataDir).toBe('/tmp/data');
    expect(config.ollamaBaseUrl).toBe('http://192.168.1.5:11434');
  });
});
