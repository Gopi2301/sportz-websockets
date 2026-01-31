import 'dotenv/config';
import express from 'express';
import { db } from './db/db.js';
import { matchRouter } from './routes/matches.js';
import http from 'http';
import { attachWebSocketServer } from './ws/server.js';
import { secuityMiddleware } from './arcject.js';
import { commentaryRoutes } from './routes/commentary.js';

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0'
const server = http.createServer(app);

app.use(express.json());

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sports API is running - VERSION 2' });
});

app.use(secuityMiddleware());

app.use('/matches', matchRouter);

app.use('/matches/:id/commentary', commentaryRoutes);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseURL = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}: ${PORT}`
  console.log(`🚀 Server is running on ${baseURL}`);
  console.log(`🚀 Server is running on ${baseURL.replace('http', 'ws')}/ws`);
});
