import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';

const HTTP_URL = process.env.TEST_HTTP_URL || 'http://localhost:3001';
const WS_URL = process.env.TEST_WS_URL || HTTP_URL.replace(/^http/, 'ws') + '/ws';
const PLAYER_COUNT = Number(process.env.PLAYER_COUNT || 150);
const HOST_PIN = process.env.HOST_PIN;
const P95_LIMIT_MS = Number(process.env.P95_LIMIT_MS || 1000);
const RSS_LIMIT_MB = Number(process.env.RSS_LIMIT_MB || 500);
const sockets: WebSocket[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function waitFor(ws: WebSocket, match: (data: any) => boolean, timeout = 12000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('Timed out waiting for WebSocket message')); }, timeout);
    const onMessage = (raw: WebSocket.RawData) => {
      const data = JSON.parse(raw.toString());
      if (data.type === 'ERROR_MSG' || data.type === 'HOST_AUTH_FAILED') { cleanup(); reject(new Error(data.message)); }
      else if (match(data)) { cleanup(); resolve(data); }
    };
    const onClose = () => { cleanup(); reject(new Error('Socket closed while waiting')); };
    const cleanup = () => { clearTimeout(timer); ws.off('message', onMessage); ws.off('close', onClose); };
    ws.on('message', onMessage); ws.on('close', onClose);
  });
}
function connect(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    sockets.push(ws);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}
async function run() {
  assert(HOST_PIN, 'HOST_PIN is required for the load test');
  assert(PLAYER_COUNT > 0 && PLAYER_COUNT <= 500, 'PLAYER_COUNT must be 1–500');
  const health = await fetch(`${HTTP_URL}/health`).then(r => r.json());
  assert(health.testMode === true, 'Refusing to load-test a server without TEST_MODE=1. Use an isolated DATA_DIR and port.');
  assert(health.players.total === 0, 'Load test needs a fresh isolated database');

  const host = await connect();
  const auth = waitFor(host, data => data.type === 'HOST_AUTH_SUCCESS');
  host.send(JSON.stringify({ type: 'HOST_AUTH', pin: HOST_PIN }));
  await auth;
  const intro = waitFor(host, data => data.type === 'SYNC_STATE' && data.gameState?.game_status === 'LEVEL_INTRO');
  host.send(JSON.stringify({ type: 'HOST_START_LEVEL', level: 1 }));
  const introState = await intro;
  const question = introState.levelQuestions.find((q: any) => !q.is_practice);
  assert(question, 'Question bank is empty; run npm run seed on the isolated DATA_DIR');
  const opened = waitFor(host, data => data.type === 'SYNC_STATE' && data.gameState?.active_question_id === question.id);
  host.send(JSON.stringify({ type: 'HOST_OPEN_QUESTION', questionId: question.id }));
  await opened;

  const runId = randomUUID().slice(0, 8);
  const starts: number[] = [];
  const latencies: number[] = [];
  const identities: { ws: WebSocket; token: string; playerId: string }[] = [];
  await Promise.all(Array.from({ length: PLAYER_COUNT }, async (_, index) => {
    const ws = await connect();
    const joined = waitFor(ws, data => data.type === 'JOIN_SUCCESS');
    ws.send(JSON.stringify({ type: 'CLIENT_JOIN', studentId: `LOAD${runId}${index}`, name: `Load player ${index}`, avatarId: 'mario' }));
    const identity = await joined;
    identities.push({ ws, token: identity.sessionToken, playerId: identity.player.id });
    ws.send(JSON.stringify({ type: 'CLIENT_PIPE_READY', ready: true }));
    const delay = Math.floor(Math.random() * 3000);
    await new Promise(resolve => setTimeout(resolve, delay));
    const ack = waitFor(ws, data => data.type === 'ANSWER_LOCKED');
    const start = Date.now(); starts.push(start);
    ws.send(JSON.stringify({ type: 'CLIENT_SUBMIT_ANSWER', questionId: question.id, selectedOption: 'A', responseTimeMs: 0 }));
    await ack;
    latencies.push(Date.now() - start);
  }));
  assert(identities.length === PLAYER_COUNT, `Only ${identities.length}/${PLAYER_COUNT} registered`);
  assert(latencies.length === PLAYER_COUNT, `Only ${latencies.length}/${PLAYER_COUNT} answers acknowledged`);
  const spread = Math.max(...starts) - Math.min(...starts);
  assert(spread <= 4000, `Submission burst took ${spread} ms, expected at most 4000 ms`);

  const first = identities[0];
  const duplicate = waitFor(first.ws, data => data.type === 'ALREADY_ANSWERED');
  first.ws.send(JSON.stringify({ type: 'CLIENT_SUBMIT_ANSWER', questionId: question.id, selectedOption: 'B' }));
  await duplicate;
  first.ws.close();
  const restored = await connect();
  const resync = waitFor(restored, data => data.type === 'SYNC_STATE' && data.player?.id === first.playerId);
  restored.send(JSON.stringify({ type: 'CLIENT_RECONNECT', sessionToken: first.token }));
  const restoredState = await resync;
  assert(restoredState.myAnswer?.selected_option === 'A', 'Reconnect did not restore the locked answer');

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.ceil(latencies.length * 0.95) - 1];
  const after = await fetch(`${HTTP_URL}/health`).then(r => r.json());
  assert(after.players.total === PLAYER_COUNT, `Database has ${after.players.total} players, expected ${PLAYER_COUNT}`);
  assert(p95 <= P95_LIMIT_MS, `p95 answer acknowledgement ${p95} ms exceeds ${P95_LIMIT_MS} ms`);
  assert(after.memoryMB.rss < RSS_LIMIT_MB, `Server RSS ${after.memoryMB.rss} MB exceeds ${RSS_LIMIT_MB} MB`);
  console.log(JSON.stringify({ status: 'PASS', players: PLAYER_COUNT, answers: latencies.length, burstMs: spread,
    p95AckMs: p95, serverRssMB: after.memoryMB.rss, reconnect: 'PASS', duplicate: 'PASS' }, null, 2));
}
run().catch(error => { console.error('LOAD TEST FAILED:', error); process.exitCode = 1; })
  .finally(() => { for (const ws of sockets) ws.close(); });
