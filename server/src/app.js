const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const uploadRouter = require('./routes/upload');
const docsRouter = require('./routes/docs');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/upload', uploadRouter);
app.use('/api/docs', docsRouter);
app.use(express.static(path.join(__dirname, '../../client/dist')));

const httpServer = http.createServer(app);

module.exports = { app, httpServer };
