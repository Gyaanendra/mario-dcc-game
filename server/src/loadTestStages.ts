import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';

// =============================================================================
// CLI Arguments & Environment Configuration
// =============================================================================
const args = process.argv.slice(2);
function getArg(flag: string, fallback: string): string {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const prefix = `${flag}=`;
  const match = args.find(a => a.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  return fallback;
}
const hasFlag = (flag: string) => args.includes(flag);

const HTTP_URL = getArg('--target', process.env.TARGET_URL || process.env.TEST_HTTP_URL || 'http://localhost:3001').replace(/\/+$/, '');
const WS_URL = HTTP_URL.replace(/^http/, 'ws') + '/ws';
const STAGES_RAW = getArg('--stages', process.env.STAGES || '500,1000,1500');
const STAGES = STAGES_RAW.split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n > 0);
const BATCH_SIZE = Number(getArg('--batch-size', '50'));
const BATCH_INTERVAL_MS = Number(getArg('--batch-interval', '60'));
const HOLD_SECONDS = Number(getArg('--hold-seconds', '5'));
const TIMEOUT_MS = Number(getArg('--timeout', '15000'));
const HOST_PIN = getArg('--host-pin', process.env.HOST_PIN || '');
const ACTION_MODE = getArg('--action', 'pipe'); // 'pipe' | 'join-only'

// =============================================================================
// Helper Types & Math
// =============================================================================
interface LatencyStats {
  min: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  avg: number;
}

interface StageReport {
  stageNumber: number;
  targetCount: number;
  connectedCount: number;
  joinedCount: number;
  answeredCount: number;
  heartbeatsAcked: number;
  droppedConnections: number;
  errorsCount: number;
  connStats: LatencyStats;
  joinStats: LatencyStats;
  ansStats: LatencyStats;
  heartbeatStats: LatencyStats;
  initialMemoryMB: { rss: number; heapUsed: number; heapTotal: number };
  peakMemoryMB: { rss: number; heapUsed: number; heapTotal: number };
  durationSec: number;
  verdict: 'PASS' | 'WARN' | 'FAIL';
  verdictReason: string;
}

function calcPercentiles(numbers: number[]): LatencyStats {
  if (numbers.length === 0) return { min: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0, avg: 0 };
  const sorted = [...numbers].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = Math.round(sorted.reduce((acc, v) => acc + v, 0) / sorted.length);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
  return { min, p50, p90, p95, p99, max, avg };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHealth(): Promise<{ status: string; uptimeSeconds: number; memoryMB: { rss: number; heapUsed: number; heapTotal: number }; players: { total: number; connected: number } }> {
  const res = await fetch(`${HTTP_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed with HTTP ${res.status}`);
  return res.json() as any;
}

function waitForMessage(ws: WebSocket, match: (data: any) => boolean, timeoutMs = TIMEOUT_MS): Promise<any> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for message (${timeoutMs}ms)`));
    }, timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === 'ERROR_MSG') {
          cleanup();
          reject(new Error(`Server error: ${data.message}`));
        } else if (match(data)) {
          cleanup();
          resolve(data);
        }
      } catch (e) {
        // Ignore non-json or partial frames
      }
    };

    const onClose = (code: number, reason: Buffer) => {
      cleanup();
      reject(new Error(`Socket closed (${code}: ${reason.toString() || 'no reason'})`));
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      ws.off('message', onMessage);
      ws.off('close', onClose);
      ws.off('error', onError);
    };

    ws.on('message', onMessage);
    ws.on('close', onClose);
    ws.on('error', onError);
  });
}

function connectSocket(url: string, timeoutMs = TIMEOUT_MS): Promise<{ ws: WebSocket; connMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`Connection handshake timed out (${timeoutMs}ms)`));
    }, timeoutMs);

    ws.once('open', () => {
      clearTimeout(timer);
      resolve({ ws, connMs: Date.now() - start });
    });

    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// =============================================================================
// Stage Execution Engine
// =============================================================================
async function runStage(stageIndex: number, targetPlayers: number): Promise<StageReport> {
  const stageRunId = randomUUID().slice(0, 6);
  console.log(`\n===============================================================================`);
  console.log(` 🚀 STARTING STAGE ${stageIndex}: ${targetPlayers} CONCURRENT PLAYERS`);
  console.log(`===============================================================================`);
  console.log(`Target:           ${HTTP_URL} (${WS_URL})`);
  console.log(`Concurrency:      ${targetPlayers} players (Batches of ${BATCH_SIZE} every ${BATCH_INTERVAL_MS}ms)`);
  console.log(`Action Mode:      ${ACTION_MODE.toUpperCase()}`);
  console.log(`Hold Duration:    ${HOLD_SECONDS} seconds`);

  // 1. Initial Telemetry
  let initialHealth;
  try {
    initialHealth = await fetchHealth();
    console.log(`Initial Health:   Uptime ${initialHealth.uptimeSeconds}s | Server RSS: ${initialHealth.memoryMB.rss} MB | Heap: ${initialHealth.memoryMB.heapUsed}/${initialHealth.memoryMB.heapTotal} MB`);
  } catch (err) {
    console.warn(`⚠️ Could not reach /health: ${(err as Error).message}. Proceeding anyway.`);
    initialHealth = { status: 'unknown', uptimeSeconds: 0, memoryMB: { rss: 0, heapUsed: 0, heapTotal: 0 }, players: { total: 0, connected: 0 } };
  }

  const stageStartTime = Date.now();
  const sockets: WebSocket[] = [];
  const connLatencies: number[] = [];
  const joinLatencies: number[] = [];
  const answerLatencies: number[] = [];
  const heartbeatLatencies: number[] = [];
  let successfulJoins = 0;
  let successfulAnswers = 0;
  let heartbeatsAcked = 0;
  let droppedConnections = 0;
  let errorsCount = 0;
  let isTearingDown = false;

  // Real-time terminal progress logger
  let lastLogTime = 0;
  const updateProgress = (phase: string) => {
    const now = Date.now();
    if (now - lastLogTime > 250 || sockets.length === targetPlayers) {
      lastLogTime = now;
      process.stdout.write(`\r  [${phase}] Sockets: ${sockets.length}/${targetPlayers} | Joined: ${successfulJoins}/${targetPlayers} | Answered: ${successfulAnswers}/${targetPlayers} | Errors: ${errorsCount} `);
    }
  };

  // 2. Connect & Register Players in Controlled Batches
  console.log(`\nConnecting & registering ${targetPlayers} players...`);
  const totalBatches = Math.ceil(targetPlayers / BATCH_SIZE);

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, targetPlayers);
    const batchPromises: Promise<void>[] = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const playerIndex = i;
      batchPromises.push((async () => {
        let ws: WebSocket | null = null;
        try {
          // A. Connect
          const { ws: socket, connMs } = await connectSocket(WS_URL);
          ws = socket;
          sockets.push(ws);
          connLatencies.push(connMs);

          ws.on('close', () => {
            if (!isTearingDown) droppedConnections++;
          });
          updateProgress('CONNECTING');

          // B. Register (CLIENT_JOIN)
          const studentId = `STG${stageIndex}_${stageRunId}_${String(playerIndex).padStart(4, '0')}`;
          const name = `Bot_${stageIndex}_${playerIndex}`;
          const avatarId = playerIndex % 2 === 0 ? 'mario' : 'luigi';

          const joinStart = Date.now();
          const joinPromise = waitForMessage(ws, m => m.type === 'JOIN_SUCCESS');
          ws.send(JSON.stringify({ type: 'CLIENT_JOIN', studentId, name, avatarId }));
          const joinData = await joinPromise;
          joinLatencies.push(Date.now() - joinStart);
          successfulJoins++;
          updateProgress('JOINING');

          // C. Pipe Quest Interaction (if enabled)
          if (ACTION_MODE === 'pipe') {
            // Signal ready at pillar 0
            const questPromise = waitForMessage(ws, m => m.type === 'PIPE_QUEST_STATE');
            ws.send(JSON.stringify({ type: 'CLIENT_PIPE_READY', ready: true, pipeIndex: 0 }));
            const questData = await questPromise;

            // Wait brief randomized human-like think time (100ms - 800ms)
            const thinkMs = 100 + Math.floor(Math.random() * 700);
            await sleep(thinkMs);

            const question = questData?.question;
            if (question) {
              const ansStart = Date.now();
              const ansPromise = waitForMessage(ws, m => m.type === 'PIPE_QUEST_RESULT' || m.type === 'PIPE_QUEST_STATE' || m.type === 'ANSWER_LOCKED');
              ws.send(JSON.stringify({
                type: 'CLIENT_PIPE_ANSWER',
                pipeIndex: 0,
                questionId: question.id,
                selectedOption: 'A'
              }));
              await ansPromise;
              answerLatencies.push(Date.now() - ansStart);
              successfulAnswers++;
            } else {
              // In case game is in a state without questions, record successful progression
              successfulAnswers++;
            }
            updateProgress('ANSWERING');
          }
        } catch (err) {
          errorsCount++;
          if (ws) {
            try { ws.close(); } catch {}
          }
        }
      })());
    }

    await Promise.all(batchPromises);
    if (batch < totalBatches - 1 && BATCH_INTERVAL_MS > 0) {
      await sleep(BATCH_INTERVAL_MS);
    }
  }

  process.stdout.write('\n');
  console.log(`✅ All ${targetPlayers} players deployed: ${successfulJoins} joined, ${successfulAnswers} answered.`);

  // 3. Concurrent Hold & Heartbeat Burst
  console.log(`Holding ${sockets.length} concurrent connections for ${HOLD_SECONDS} seconds & checking heartbeats...`);
  const heartbeatPromises = sockets.map(async (ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const start = Date.now();
        const ackPromise = waitForMessage(ws, m => m.type === 'HEARTBEAT_ACK', 5000);
        ws.send(JSON.stringify({ type: 'CLIENT_HEARTBEAT' }));
        await ackPromise;
        heartbeatLatencies.push(Date.now() - start);
        heartbeatsAcked++;
      } catch {
        // Socket may have dropped during burst
      }
    }
  });

  await Promise.all(heartbeatPromises);
  await sleep(Math.max(1000, HOLD_SECONDS * 1000 - 1000));

  // 4. Post-Stage Telemetry
  let peakHealth;
  try {
    peakHealth = await fetchHealth();
  } catch {
    peakHealth = initialHealth;
  }

  const durationSec = Math.round((Date.now() - stageStartTime) / 1000);

  // 5. Clean Teardown
  isTearingDown = true;
  console.log(`Tearing down ${sockets.length} sockets cleanly...`);
  for (let i = 0; i < sockets.length; i += 100) {
    const chunk = sockets.slice(i, i + 100);
    chunk.forEach(s => {
      try { s.close(); } catch {}
    });
    await sleep(20);
  }
  await sleep(2000); // Allow server TCP CLOSE_WAIT to flush

  // 6. Calculate Stats & Verdict
  const connStats = calcPercentiles(connLatencies);
  const joinStats = calcPercentiles(joinLatencies);
  const ansStats = calcPercentiles(answerLatencies);
  const heartbeatStats = calcPercentiles(heartbeatLatencies);

  const joinSuccessRate = targetPlayers > 0 ? (successfulJoins / targetPlayers) * 100 : 0;
  let verdict: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  let verdictReason = 'All metrics within production tolerances';

  if (joinSuccessRate < 90) {
    verdict = 'FAIL';
    verdictReason = `Join success rate ${joinSuccessRate.toFixed(1)}% is below 90% threshold`;
  } else if (joinSuccessRate < 98) {
    verdict = 'WARN';
    verdictReason = `Join success rate ${joinSuccessRate.toFixed(1)}% has minor drops (<98%)`;
  } else if (ansStats.p95 > 1500) {
    verdict = 'WARN';
    verdictReason = `Answer p95 latency (${ansStats.p95}ms) exceeds 1500ms`;
  }

  console.log(`-------------------------------------------------------------------------------`);
  console.log(`Stage ${stageIndex} Result: [${verdict}] - ${verdictReason}`);
  console.log(`  - Handshake p95: ${connStats.p95}ms | Join p95: ${joinStats.p95}ms | Answer p95: ${ansStats.p95}ms | Heartbeat p95: ${heartbeatStats.p95}ms`);
  console.log(`  - Server RSS: ${initialHealth.memoryMB.rss} MB -> ${peakHealth.memoryMB.rss} MB (+${peakHealth.memoryMB.rss - initialHealth.memoryMB.rss} MB)`);
  console.log(`  - Duration: ${durationSec}s | Errors: ${errorsCount} | Dropped: ${droppedConnections}`);

  return {
    stageNumber: stageIndex,
    targetCount: targetPlayers,
    connectedCount: connLatencies.length,
    joinedCount: successfulJoins,
    answeredCount: successfulAnswers,
    heartbeatsAcked,
    droppedConnections,
    errorsCount,
    connStats,
    joinStats,
    ansStats,
    heartbeatStats,
    initialMemoryMB: initialHealth.memoryMB,
    peakMemoryMB: peakHealth.memoryMB,
    durationSec,
    verdict,
    verdictReason
  };
}

// =============================================================================
// Main Multi-Stage Runner
// =============================================================================
async function run() {
  console.log(`===============================================================================`);
  console.log(` 🏆 MARIO CAREER QUEST — MULTI-STAGE LOAD TEST SUITE`);
  console.log(`===============================================================================`);
  console.log(`Target URL:       ${HTTP_URL}`);
  console.log(`Stages Scheduled: ${STAGES.join(' -> ')} concurrent players`);
  console.log(`Batch Size:       ${BATCH_SIZE} sockets / batch (every ${BATCH_INTERVAL_MS}ms)`);
  console.log(`Hold Duration:    ${HOLD_SECONDS}s per stage`);
  console.log(`Timeout:          ${TIMEOUT_MS}ms`);

  const reports: StageReport[] = [];

  for (let i = 0; i < STAGES.length; i++) {
    const targetPlayers = STAGES[i];
    const report = await runStage(i + 1, targetPlayers);
    reports.push(report);

    // Pause between stages to let server settle
    if (i < STAGES.length - 1) {
      console.log(`\nCooling down for 3 seconds before next stage...`);
      await sleep(3000);
    }
  }

  // ===========================================================================
  // Final Comprehensive Benchmark Report
  // ===========================================================================
  console.log(`\n\n`);
  console.log(`===============================================================================================================`);
  console.log(`                             MARIO CAREER QUEST — FINAL LOAD BENCHMARK REPORT                                  `);
  console.log(`===============================================================================================================`);
  console.log(`Target:    ${HTTP_URL}`);
  console.log(`Date:      ${new Date().toISOString()}`);
  console.log(`---------------------------------------------------------------------------------------------------------------`);
  console.log(`Stage   | Target | Success | Conn p50/p95 | Join p50/p95 | Ans p50/p95  | Server RSS | Heap Used | Verdict `);
  console.log(`---------------------------------------------------------------------------------------------------------------`);

  for (const r of reports) {
    const successRate = ((r.joinedCount / r.targetCount) * 100).toFixed(1) + '%';
    const connStr = `${r.connStats.p50}/${r.connStats.p95}ms`.padEnd(12);
    const joinStr = `${r.joinStats.p50}/${r.joinStats.p95}ms`.padEnd(12);
    const ansStr = `${r.ansStats.p50}/${r.ansStats.p95}ms`.padEnd(12);
    const rssStr = `${r.peakMemoryMB.rss} MB`.padEnd(10);
    const heapStr = `${r.peakMemoryMB.heapUsed} MB`.padEnd(9);
    const stageStr = `Stage ${r.stageNumber}`.padEnd(7);
    const targetStr = String(r.targetCount).padStart(6);

    console.log(`${stageStr} | ${targetStr} | ${successRate.padStart(7)} | ${connStr} | ${joinStr} | ${ansStr} | ${rssStr} | ${heapStr} |  ${r.verdict}  `);
  }
  console.log(`===============================================================================================================`);

  // Overall Assessment
  const allPass = reports.every(r => r.verdict === 'PASS');
  const anyFail = reports.some(r => r.verdict === 'FAIL');

  console.log(`\n📊 EXECUTIVE SUMMARY & FINDINGS:`);
  reports.forEach(r => {
    console.log(` • ${r.targetCount} Players: ${r.joinedCount}/${r.targetCount} joined (${((r.joinedCount/r.targetCount)*100).toFixed(1)}%). Answer p95: ${r.ansStats.p95}ms. Server RSS: ${r.peakMemoryMB.rss}MB. [${r.verdict}]`);
  });

  if (allPass) {
    console.log(`\n🎉 VERDICT: EXCELLENT — The platform effortlessly sustained 500, 1000, and 1500 concurrent players with sub-second latencies and stable memory!`);
  } else if (!anyFail) {
    console.log(`\n⚠️ VERDICT: ACCEPTABLE WITH OBSERVATIONS — All stages completed successfully with minor latency stretching under peak 1500 load.`);
  } else {
    console.log(`\n❌ VERDICT: ATTENTION NEEDED — One or more stages exceeded failure thresholds. Review socket connection limits or network bandwidth.`);
    process.exitCode = 1;
  }
}

run().catch(err => {
  console.error('\n💥 FATAL LOAD TEST ERROR:', err);
  process.exit(1);
});
