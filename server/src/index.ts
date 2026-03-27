import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { registerBingoHandlers, cleanupStaleRooms as cleanupBingoRooms } from './games/bingo/index.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', games: ['bingo'], timestamp: Date.now() });
});

const httpServer = createServer(app);

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',')
  : ['http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Register game namespaces
const bingoNsp = io.of('/bingo');
registerBingoHandlers(bingoNsp);

// Cleanup stale rooms every 30 minutes
setInterval(cleanupBingoRooms, 30 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
  console.log(`  /bingo namespace active`);
});
