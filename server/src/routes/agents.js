const express = require('express');
const { listAgents, getAgent, createAgent, updateAgent, deleteAgent } = require('../agents/store');
const { listTools } = require('../agents/tools');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ agents: listAgents() });
});

router.get('/tools', (_req, res) => {
  res.json({ tools: listTools() });
});

router.post('/', (req, res) => {
  const { name, description, instructions, pinnedDocs, enabledTools } = req.body;
  if (!name || !instructions) {
    return res.status(400).json({ error: 'name and instructions are required' });
  }
  const agent = createAgent({ name, description, instructions, pinnedDocs, enabledTools });
  res.status(201).json({ agent });
});

router.put('/:id', (req, res) => {
  const agent = updateAgent(req.params.id, req.body);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({ agent });
});

router.delete('/:id', (req, res) => {
  const deleted = deleteAgent(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Agent not found' });
  res.json({ deleted: req.params.id });
});

module.exports = router;
