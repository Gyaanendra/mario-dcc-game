import type { WebSocket } from 'ws';
import { dbManager } from './db.js';
import { gameManager } from './state.js';

const HOST_PIN = process.env.HOST_PIN || 'DCC2026';

export function handleWebSocketConnection(socket: WebSocket, req: any) {
  let boundPlayerId: string | null = null;
  let isHost = false;
  let isProjector = false;

  socket.on('message', (raw: Buffer | string) => {
    try {
      const data = JSON.parse(raw.toString());
      const { type } = data;

      // =======================================================================
      // PLAYER MESSAGES
      // =======================================================================
      if (type === 'CLIENT_JOIN') {
        const { studentId, name, avatarId } = data;
        if (!studentId || !name) {
          socket.send(JSON.stringify({ type: 'ERROR_MSG', message: 'Student ID and Name required' }));
          return;
        }

        const player = dbManager.getOrCreatePlayer(studentId, name, avatarId || 'mario');
        boundPlayerId = player.id;
        gameManager.registerPlayerSocket(player.id, socket);

        socket.send(JSON.stringify({
          type: 'JOIN_SUCCESS',
          playerId: player.id,
          player
        }));

        // Send current game state sync
        socket.send(JSON.stringify(gameManager.getPlayerSyncPayload(player.id)));

        // Notify hosts of updated player list
        const allPlayers = dbManager.getAllPlayersForHost();
        gameManager.broadcastToHosts({ type: 'PLAYERS_UPDATE', players: allPlayers });
        return;
      }

      if (type === 'CLIENT_RECONNECT') {
        const { playerId } = data;
        if (!playerId) {
          socket.send(JSON.stringify({ type: 'ERROR_MSG', message: 'Player ID required' }));
          return;
        }

        const player = dbManager.getPlayerById(playerId);
        if (!player) {
          socket.send(JSON.stringify({ type: 'SESSION_EXPIRED', message: 'Player session not found' }));
          return;
        }

        boundPlayerId = player.id;
        gameManager.registerPlayerSocket(player.id, socket);

        // Send fresh state sync immediately
        socket.send(JSON.stringify(gameManager.getPlayerSyncPayload(player.id)));
        return;
      }

      if (type === 'CLIENT_SUBMIT_ANSWER') {
        if (!boundPlayerId) {
          socket.send(JSON.stringify({ type: 'ERROR_MSG', message: 'Not authenticated' }));
          return;
        }

        const state = dbManager.getGameState();
        if (state.game_status !== 'QUESTION_ACTIVE' || !state.active_question_id) {
          socket.send(JSON.stringify({ type: 'SUBMISSION_REJECTED', message: 'No question is currently accepting answers' }));
          return;
        }

        const { questionId, selectedOption, responseTimeMs } = data;
        if (questionId !== state.active_question_id) {
          socket.send(JSON.stringify({ type: 'SUBMISSION_REJECTED', message: 'Question expired' }));
          return;
        }

        const res = dbManager.submitAnswer(boundPlayerId, questionId, selectedOption, responseTimeMs || 5000);
        if (res.alreadyAnswered) {
          socket.send(JSON.stringify({ type: 'ALREADY_ANSWERED', message: 'You have already locked in your answer' }));
          return;
        }

        // Notify client that answer is locked
        socket.send(JSON.stringify({
          type: 'ANSWER_LOCKED',
          selectedOption,
          coinsAwarded: res.coinsAwarded
        }));

        // Update Host and Projector with live submission counts
        const stats = dbManager.getAnswerStats(questionId);
        gameManager.broadcastToHosts({ type: 'LIVE_SUBMISSION_STATS', stats });
        gameManager.broadcastToProjectors({ type: 'LIVE_SUBMISSION_STATS', stats });
        return;
      }

      if (type === 'CLIENT_SUBMIT_PILLAR_ANSWER') {
        if (!boundPlayerId) {
          socket.send(JSON.stringify({ type: 'ERROR_MSG', message: 'Not joined' }));
          return;
        }
        const { pillarId, questionId, selectedOption, isCorrect } = data;
        const result = dbManager.submitPillarAnswer(boundPlayerId, pillarId, questionId, selectedOption, !!isCorrect);
        if (!result) {
          socket.send(JSON.stringify({ type: 'PILLAR_ALREADY_ANSWERED', pillarId }));
        } else {
          socket.send(JSON.stringify({ type: 'PILLAR_ANSWER_SAVED', pillarId, isCorrect: !!isCorrect }));
          const pillarAnswers = dbManager.getAllPillarAnswers();
          const allPlayers = dbManager.getAllPlayersForHost();
          gameManager.broadcastToHosts({ type: 'PILLAR_ANSWERS_UPDATE', pillarAnswers });
          gameManager.broadcastToHosts({ type: 'PLAYERS_UPDATE', players: allPlayers });
        }
        return;
      }

      if (type === 'CLIENT_HEARTBEAT') {
        if (boundPlayerId) {
          dbManager.setPlayerConnection(boundPlayerId, true);
        }
        socket.send(JSON.stringify({ type: 'HEARTBEAT_ACK' }));
        return;
      }

      // =======================================================================
      // PROJECTOR MESSAGES
      // =======================================================================
      if (type === 'PROJECTOR_CONNECT') {
        isProjector = true;
        gameManager.registerProjectorSocket(socket);
        return;
      }

      // =======================================================================
      // HOST MESSAGES (Protected with PIN)
      // =======================================================================
      if (type === 'HOST_AUTH') {
        const { pin } = data;
        if (pin === HOST_PIN) {
          isHost = true;
          gameManager.registerHostSocket(socket);
          socket.send(JSON.stringify({ type: 'HOST_AUTH_SUCCESS' }));
        } else {
          socket.send(JSON.stringify({ type: 'ERROR_MSG', message: 'Invalid Admin PIN' }));
        }
        return;
      }

      // Verify host privileges for remaining commands
      if (!isHost) {
        socket.send(JSON.stringify({ type: 'ERROR_MSG', message: 'Unauthorized host action' }));
        return;
      }

      switch (type) {
        case 'HOST_START_LEVEL':
          gameManager.startLevel(data.level || 1);
          break;

        case 'HOST_OPEN_QUESTION':
          gameManager.openQuestion(data.questionId);
          break;

        case 'HOST_PAUSE_TIMER':
          gameManager.pauseTimer();
          break;

        case 'HOST_RESUME_TIMER':
          gameManager.resumeTimer();
          break;

        case 'HOST_EXTEND_TIMER':
          gameManager.extendTimer(data.seconds || 10);
          break;

        case 'HOST_LOCK_QUESTION':
          gameManager.lockQuestion();
          break;

        case 'HOST_REVEAL_ANSWER':
          gameManager.revealAnswer();
          break;

        case 'HOST_SHOW_LEADERBOARD':
          gameManager.showLeaderboard();
          break;

        case 'HOST_CUTOFF_L2':
          gameManager.executeCutoff(2);
          break;

        case 'HOST_CUTOFF_L3':
          gameManager.executeCutoff(3);
          break;

        case 'HOST_START_BOWSER_STAGE':
          gameManager.startBowserStage();
          break;

        case 'HOST_SUBMIT_JUDGE_SCORE':
          gameManager.submitJudgeScore({
            finalist_id: data.finalist_id,
            judge_name: data.judge_name || 'DCC Judge',
            clarity_score: Number(data.clarity_score) || 0,
            reasoning_score: Number(data.reasoning_score) || 0,
            judgement_score: Number(data.judgement_score) || 0,
            communication_score: Number(data.communication_score) || 0,
            remarks: data.remarks || ''
          });
          break;

        case 'HOST_FINISH_AND_PODIUM':
          gameManager.finishAndShowPodium();
          break;

        case 'HOST_RESET_GAME':
          gameManager.resetGame();
          break;

        default:
          socket.send(JSON.stringify({ type: 'ERROR_MSG', message: `Unknown host action: ${type}` }));
      }
    } catch (err: any) {
      console.error('[WS Error]', err);
      socket.send(JSON.stringify({ type: 'ERROR_MSG', message: err.message || 'Internal server error' }));
    }
  });

  socket.on('close', () => {
    if (boundPlayerId) {
      gameManager.unregisterPlayerSocket(boundPlayerId, socket);
    }
    if (isHost) {
      gameManager.unregisterHostSocket(socket);
    }
    if (isProjector) {
      gameManager.unregisterProjectorSocket(socket);
    }
  });

  socket.on('error', (err) => {
    console.error('[Socket Error]', err);
  });
}

