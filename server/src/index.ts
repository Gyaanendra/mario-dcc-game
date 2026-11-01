import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { handleWebSocketConnection } from './ws.js';
import { dbManager } from './db.js';
import { level2QuestionBank } from './level2QuestionBank.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

const app = fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
});

async function start() {
  if (!process.env.HOST_PIN || process.env.HOST_PIN.length < 12) {
    throw new Error('Set a unique HOST_PIN of at least 12 characters before starting the server');
  }
  const bankStatus = dbManager.installLevel2Questions(level2QuestionBank);
  app.log.info({ bankStatus, questions: level2QuestionBank.length }, 'Level 2 question bank checked');

  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 16384
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
      testMode: process.env.TEST_MODE === '1',
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
  app.get('/api/leaderboard', async (req: any, reply) => {
    const level = [1, 2, 3].includes(Number(req.query?.level)) ? Number(req.query.level) : 1;
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 15));
    if (level === 3 && dbManager.getGameState().game_status !== 'PODIUM_WINNERS')
      return reply.code(403).send({ error: 'Final scores are not revealed yet' });
    return dbManager.getLeaderboard(level, limit).map(({ id, student_id, session_token_hash, ...safe }) =>
      level === 3 ? safe : { ...safe, level3_score: 0 });
  });

  // REST Questions Overview for Host
  app.get('/api/questions', async (req: any, reply) => {
    const provided = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
    const expected = process.env.HOST_PIN!;
    const a = Buffer.from(provided), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return reply.code(401).send({ error: 'Host authentication required' });
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
