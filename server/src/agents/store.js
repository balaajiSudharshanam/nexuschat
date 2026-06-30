const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const AGENTS_FILE = path.join(config.dataDir, 'agents.json');

function readAll() {
  if (!fs.existsSync(AGENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeAll(agents) {
  fs.mkdirSync(path.dirname(AGENTS_FILE), { recursive: true });
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf8');
}

function listAgents() {
  return readAll();
}

function getAgent(id) {
  return readAll().find(a => a.id === id) || null;
}

function createAgent({ name, description, instructions, pinnedDocs = [], enabledTools = [] }) {
  const agents = readAll();
  const agent = {
    id: crypto.randomUUID(),
    name,
    description,
    instructions,
    pinnedDocs,
    enabledTools,
    createdAt: Date.now(),
  };
  agents.push(agent);
  writeAll(agents);
  return agent;
}

function updateAgent(id, patch) {
  const agents = readAll();
  const idx = agents.findIndex(a => a.id === id);
  if (idx === -1) return null;
  agents[idx] = { ...agents[idx], ...patch, id };
  writeAll(agents);
  return agents[idx];
}

function deleteAgent(id) {
  const agents = readAll();
  const idx = agents.findIndex(a => a.id === id);
  if (idx === -1) return false;
  agents.splice(idx, 1);
  writeAll(agents);
  return true;
}

module.exports = { listAgents, getAgent, createAgent, updateAgent, deleteAgent };
