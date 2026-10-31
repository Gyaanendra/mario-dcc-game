import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { handleWebSocketConnection } from './ws.js';
import { dbManager } from './db.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

const app = fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
});

async function start() {
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576 // 1MB
    }
  });

  // Serve frontend static build if present
  const clientDistPath = path.resolve(process.cwd(), '../client/dist');
  const altDistPath = path.resolve(process.cwd(), 'client/dist');
  const staticPath = fs.existsSync(clientDistPath) ? clientDistPath : (fs.existsSync(altDistPath) ? altDistPath : null);

  if (staticPath) {
    await app.register(fastifyStatic, {
      root: staticPath,
      prefix: '/'
    });
    app.setNotFoundHandler((req, reply) => {
      reply.sendFile('index.html');
    });
  }

  // REST Health Check & Stats
  app.get('/health', async () => {
    const mem = process.memoryUsage();
    const counts = dbManager.getPlayerCount();
    return {
      status: 'ok',
      event: 'Mario Career Quest - Bennett University DCC',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMB: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
      },
      players: counts
    };
  });

  // REST Leaderboard
  app.get('/api/leaderboard', async (req: any) => {
    const level = Number(req.query?.level) || 1;
    const limit = Number(req.query?.limit) || 50;
    return dbManager.getLeaderboard(level, limit);
  });

  // REST Questions Overview for Host
  app.get('/api/questions', async (req: any) => {
    const level = Number(req.query?.level) || 1;
    return dbManager.getQuestionsForLevel(level, true);
  });

  // WebSocket Endpoint
  await app.register(async function (fastifyInstance) {
    fastifyInstance.get('/ws', { websocket: true }, (socket, req) => {
      handleWebSocketConnection(socket as any, req);
    });
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n======================================================`);
    console.log(` MARIO CAREER QUEST SERVER RUNNING`);
    console.log(` HTTP & WS: http://localhost:${PORT}`);
    console.log(` Health:    http://localhost:${PORT}/health`);
    console.log(`======================================================\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
