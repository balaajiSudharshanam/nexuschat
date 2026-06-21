const express = require('express');
const multer = require('multer');
const { ingestPdf } = require('../rag/ingest');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const docName = req.file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');

  try {
    const chunkCount = await ingestPdf(req.file.buffer, docName);
    res.json({ docName, chunkCount });
  } catch (err) {
    console.error('[upload] error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
