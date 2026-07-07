const webSearch = require('./webSearch');
const pdfMaker = require('./pdfMaker');
const excel = require('./excel');

const REGISTRY = new Map([
  [webSearch.id, webSearch],
  [pdfMaker.id, pdfMaker],
  [excel.id, excel],
]);

async function executeTool(toolId, args) {
  const tool = REGISTRY.get(toolId);
  if (!tool) throw new Error(`Unknown tool: ${toolId}`);
  return tool.run(args);
}

function listTools() {
  return Array.from(REGISTRY.values()).map(({ id, description }) => ({ id, description }));
}

module.exports = { executeTool, listTools };
