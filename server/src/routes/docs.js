const express = require('express');
const { listDocs, deleteDoc } = require('../rag/store');
const { clearHistory } = require('../ws/history');

const router = express.Router();

let _broadcast = () => {};
function setBroadcast(fn) { _broadcast = fn; }

router.get('/', async (_req, res) => {
  const docs = await listDocs();
  res.json({ docs });
});

router.delete('/:docName', async (req, res) => {
  await deleteDoc(req.params.docName);
  _broadcast({ type: 'doc_removed', docName: req.params.docName });
  res.json({ deleted: req.params.docName });
});

router.delete('/', async (_req, res) => {
  const docs = await listDocs();
  await Promise.all(docs.map(d => deleteDoc(d)));
  clearHistory();
  _broadcast({ type: 'history_cleared' });
  res.json({ deleted: docs, historyCleared: true });
});

module.exports = router;
module.exports.setBroadcast = setBroadcast;
