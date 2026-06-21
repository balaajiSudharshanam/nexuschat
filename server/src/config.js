require('dotenv').config();

function loadConfig(env) {
  return {
    model: env.MODEL || 'llama3.2',
    embedModel: env.EMBED_MODEL || 'nomic-embed-text',
    port: parseInt(env.SERVER_PORT || '3000', 10),
    bonjourName: env.BONJOUR_NAME || 'nexus',
    dataDir: env.DATA_DIR || './data',
    ollamaBaseUrl: env.OLLAMA_BASE_URL || 'http://localhost:11434',
  };
}

module.exports = loadConfig(process.env);
module.exports.loadConfig = loadConfig;
