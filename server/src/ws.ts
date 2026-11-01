import type { WebSocket } from 'ws';
import { timingSafeEqual } from 'node:crypto';
import { dbManager } from './db.js';
import { gameManager } from './state.js';

function pinMatches(pin: unknown) {
  const expected = process.env.HOST_PIN;
  if (!expected || typeof pin !== 'string') return false;
  const a = Buffer.from(pin), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function handleWebSocketConnection(socket: WebSocket, _req: unknown) {
  let boundPlayerId: string | null = null;
  let isHost = false;
  let isProjector = false;
  const send = (payload: unknown) => socket.send(JSON.stringify(payload));

  socket.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (!data || typeof data.type !== 'string') throw new Error('Invalid message');
      const { type } = data;

      if (type === 'CLIENT_JOIN') {
        if (boundPlayerId || isHost || isProjector) throw new Error('This connection already has a role');
        const { player, sessionToken } = dbManager.createPlayer(data.studentId, data.name, data.avatarId);
        boundPlayerId = player.id;
        gameManager.registerPlayerSocket(player.id, socket);
        const { session_token_hash, ...safePlayer } = player;
        send({ type: 'JOIN_SUCCESS', sessionToken, player: safePlayer });
        send(gameManager.getPlayerSyncPayload(player.id));
        send(gameManager.getPipeQuestPayload(player.id));
        return;
      }
      if (type === 'CLIENT_RECONNECT') {
        if (isHost || isProjector) throw new Error('This connection already has a role');
        const player = dbManager.getPlayerBySessionToken(data.sessionToken);
        if (!player) { send({ type: 'SESSION_EXPIRED', message: 'Session not found. Ask the host for help if you already registered.' }); return; }
        if (boundPlayerId && boundPlayerId !== player.id) throw new Error('This connection belongs to another player');
        boundPlayerId = player.id;
        gameManager.registerPlayerSocket(player.id, socket);
        send(gameManager.getPlayerSyncPayload(player.id));
        send(gameManager.getPipeQuestPayload(player.id));
        return;
      }
      if (type === 'CLIENT_SUBMIT_ANSWER') {
        if (!boundPlayerId) throw new Error('Join or reconnect before answering');
        const result = gameManager.submitAnswer(boundPlayerId, Number(data.questionId), String(data.selectedOption || ''));
        send(result.alreadyAnswered ? { type: 'ALREADY_ANSWERED', message: 'Answer already locked in' }
          : { type: 'ANSWER_LOCKED', selectedOption: String(data.selectedOption).toUpperCase() });
        return;
      }
      if (type === 'CLIENT_PIPE_READY') {
        if (!boundPlayerId) throw new Error('Join before entering a pipe');
        gameManager.setPipeReady(boundPlayerId, data.ready === true, Number(data.pipeIndex));
        return;
      }
      if (type === 'CLIENT_PIPE_ANSWER') {
        if (!boundPlayerId) throw new Error('Join before answering');
        const result = gameManager.submitPipeQuestAnswer(boundPlayerId, Number(data.pipeIndex),
          Number(data.questionId), String(data.selectedOption || ''), Number(data.responseTimeMs || 0));
        send(result);
        send(gameManager.getPipeQuestPayload(boundPlayerId));
        return;
      }
      if (type === 'CLIENT_FLAGPOLE_CLEAR') {
        if (!boundPlayerId) throw new Error('Join before clearing run');
        const result = gameManager.claimFlagpoleBonus(boundPlayerId);
        send(result);
        return;
      }
      if (type === 'CLIENT_HEARTBEAT') { send({ type: 'HEARTBEAT_ACK' }); return; }
      if (type === 'PROJECTOR_CONNECT') {
        if (boundPlayerId || isHost) throw new Error('This connection already has a role');
        isProjector = true;
        gameManager.registerProjectorSocket(socket);
        return;
      }
      if (type === 'HOST_AUTH') {
        if (boundPlayerId || isProjector) throw new Error('This connection already has a role');
        if (!pinMatches(data.pin)) { send({ type: 'HOST_AUTH_FAILED', message: 'Invalid host PIN' }); return; }
        isHost = true;
        gameManager.registerHostSocket(socket);
        send({ type: 'HOST_AUTH_SUCCESS' });
        return;
      }
      if (!isHost) throw new Error('Host authentication required');
      switch (type) {
        case 'HOST_START_LEVEL': gameManager.startLevel(Number(data.level)); break;
        case 'HOST_OPEN_QUESTION': gameManager.openQuestion(Number(data.questionId)); break;
        case 'HOST_PAUSE_TIMER':
        case 'HOST_PAUSE_GAME': gameManager.pauseTimer(); break;
        case 'HOST_RESUME_TIMER':
        case 'HOST_RESUME_GAME': gameManager.resumeTimer(); break;
        case 'HOST_EXTEND_TIMER': gameManager.extendTimer(Number(data.seconds || 10)); break;
        case 'HOST_LOCK_QUESTION': gameManager.lockQuestion(); break;
        case 'HOST_REVEAL_ANSWER': gameManager.revealAnswer(); break;
        case 'HOST_VOID_QUESTION': gameManager.voidCurrentQuestion(); break;
        case 'HOST_SHOW_LEADERBOARD': gameManager.showLeaderboard(); break;
        case 'HOST_CUTOFF_L2': gameManager.executeCutoff(2); break;
        case 'HOST_CUTOFF_L3': gameManager.executeCutoff(3); break;
        case 'HOST_TRIGGER_SUDDEN_DEATH': gameManager.triggerSuddenDeath(); break;
        case 'HOST_START_BOWSER_STAGE': gameManager.startBowserStage(); break;
        case 'HOST_SELECT_SPEAKER': gameManager.selectSpeaker(String(data.finalist_id)); break;
        case 'HOST_SPEAKER_START': gameManager.speakerStart(); break;
        case 'HOST_SPEAKER_PAUSE': gameManager.speakerPause(); break;
        case 'HOST_SPEAKER_RESET': gameManager.speakerReset(); break;
        case 'HOST_SUBMIT_JUDGE_SCORE':
          gameManager.submitJudgeScore({ finalist_id: String(data.finalist_id), judge_name: String(data.judge_name),
            clarity_score: Number(data.clarity_score), reasoning_score: Number(data.reasoning_score),
            judgement_score: Number(data.judgement_score), communication_score: Number(data.communication_score),
            remarks: String(data.remarks || '') });
          break;
        case 'HOST_SUBMIT_FINAL_TIEBREAK':
          gameManager.submitFinalTiebreak({ finalist_id: String(data.finalist_id), judge_name: String(data.judge_name),
            round_no: Number(data.round_no), clarity_score: Number(data.clarity_score), reasoning_score: Number(data.reasoning_score) });
          break;
        case 'HOST_VERIFY_RESULTS': gameManager.verifyResults(); break;
        case 'HOST_FINISH_AND_PODIUM': gameManager.finishAndShowPodium(); break;
        case 'HOST_RESET_GAME': gameManager.resetGame(Boolean(data.wipePlayers)); break;
        case 'HOST_RECOVER_PLAYER': {
          const { sessionToken, playerId } = dbManager.reissueSession(String(data.studentId));
          gameManager.disconnectPlayer(playerId);
          send({ type: 'RECOVERY_TOKEN', studentId: String(data.studentId), sessionToken });
          break;
        }
        default: throw new Error(`Unknown host action: ${type}`);
      }
    } catch (error) {
      send({ type: 'ERROR_MSG', message: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  socket.on('close', () => {
    if (boundPlayerId) gameManager.unregisterPlayerSocket(boundPlayerId, socket);
    if (isHost) gameManager.unregisterHostSocket(socket);
    if (isProjector) gameManager.unregisterProjectorSocket(socket);
  });
  socket.on('error', (error) => console.error('[Socket Error]', error));
}
