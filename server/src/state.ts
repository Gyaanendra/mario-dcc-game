import type { WebSocket } from 'ws';
import { dbManager } from './db.js';
import { GameStatus, Question, Player, GameStateRecord } from './types.js';

export class GameManager {
  private playerSockets = new Map<string, WebSocket>();
  private hostSockets = new Set<WebSocket>();
  private projectorSockets = new Set<WebSocket>();

  private timerInterval: NodeJS.Timeout | null = null;
  private remainingSeconds: number = 0;
  private timerPaused: boolean = false;

  constructor() {
    // Restore or sync current state
    const state = dbManager.getGameState();
    if (state.game_status === 'QUESTION_ACTIVE' && state.active_question_id) {
      // If server restarts during active question, set to locked for safety
      dbManager.updateGameState({ game_status: 'QUESTION_LOCKED' });
    }
  }

  // --- Socket Registration ---
  registerPlayerSocket(playerId: string, ws: WebSocket) {
    this.playerSockets.set(playerId, ws);
    dbManager.setPlayerConnection(playerId, true);
    this.broadcastHostAndProjectorCounts();
  }

  unregisterPlayerSocket(playerId: string, ws: WebSocket) {
    if (this.playerSockets.get(playerId) === ws) {
      this.playerSockets.delete(playerId);
      dbManager.setPlayerConnection(playerId, false);
      this.broadcastHostAndProjectorCounts();
    }
  }

  registerHostSocket(ws: WebSocket) {
    this.hostSockets.add(ws);
    // Send full host state
    this.sendHostSync(ws);
  }

  unregisterHostSocket(ws: WebSocket) {
    this.hostSockets.delete(ws);
  }

  registerProjectorSocket(ws: WebSocket) {
    this.projectorSockets.add(ws);
    // Send projector sync
    this.sendProjectorSync(ws);
  }

  unregisterProjectorSocket(ws: WebSocket) {
    this.projectorSockets.delete(ws);
  }

  // --- Broadcasting Helpers ---
  broadcastToAll(message: any) {
    const payload = JSON.stringify(message);
    for (const ws of this.playerSockets.values()) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
    for (const ws of this.hostSockets) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
    for (const ws of this.projectorSockets) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  broadcastToHosts(message: any) {
    const payload = JSON.stringify(message);
    for (const ws of this.hostSockets) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  broadcastToProjectors(message: any) {
    const payload = JSON.stringify(message);
    for (const ws of this.projectorSockets) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  broadcastToPlayers(message: any) {
    const payload = JSON.stringify(message);
    for (const ws of this.playerSockets.values()) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  broadcastHostAndProjectorCounts() {
    const counts = dbManager.getPlayerCount();
    const payload = JSON.stringify({
      type: 'COUNTS_UPDATE',
      totalRegistered: counts.total,
      connectedPlayers: counts.connected
    });
    for (const ws of this.hostSockets) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
    for (const ws of this.projectorSockets) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  // --- State Synchronization ---
  getPlayerSyncPayload(playerId: string) {
    const state = dbManager.getGameState();
    const player = dbManager.getPlayerById(playerId);
    let activeQuestion: any = null;
    let myAnswer: any = null;

    if (state.active_question_id) {
      const q = dbManager.getQuestion(state.active_question_id);
      if (q) {
        activeQuestion = {
          id: q.id,
          level: q.level,
          category: q.category,
          prompt: q.prompt,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          time_limit_sec: q.time_limit_sec,
          points: q.points,
          // Only show correct_option if state is REVEAL
          correct_option: state.game_status === 'REVEAL' ? q.correct_option : null,
          explanation: state.game_status === 'REVEAL' ? q.explanation : null
        };
        myAnswer = dbManager.getPlayerAnswer(playerId, q.id);
      }
    }

    return {
      type: 'SYNC_STATE',
      role: 'PLAYER',
      gameState: {
        ...state,
        remaining_seconds: this.remainingSeconds,
        timer_paused: this.timerPaused
      },
      player: player || null,
      activeQuestion,
      myAnswer: myAnswer
        ? {
            selected_option: myAnswer.selected_option,
            is_correct: state.game_status === 'REVEAL' ? myAnswer.is_correct : null,
            coins_awarded: state.game_status === 'REVEAL' ? myAnswer.coins_awarded : null
          }
        : null
    };
  }

  sendProjectorSync(ws: WebSocket) {
    const state = dbManager.getGameState();
    const counts = dbManager.getPlayerCount();
    let activeQuestion: any = null;
    let answerStats: any = null;

    if (state.active_question_id) {
      const q = dbManager.getQuestion(state.active_question_id);
      if (q) {
        activeQuestion = {
          id: q.id,
          level: q.level,
          category: q.category,
          prompt: q.prompt,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          time_limit_sec: q.time_limit_sec,
          points: q.points,
          correct_option: state.game_status === 'REVEAL' ? q.correct_option : null,
          explanation: state.game_status === 'REVEAL' ? q.explanation : null
        };
        answerStats = dbManager.getAnswerStats(q.id);
      }
    }

    const leaderboard = dbManager.getLeaderboard(state.current_level || 1, 15);
    const podium = state.game_status === 'PODIUM_WINNERS' ? dbManager.getFinalistPodium() : null;
    const finalists = state.game_status === 'BOWSER_STAGE' ? dbManager.getTop10Finalists() : null;

    ws.send(JSON.stringify({
      type: 'SYNC_STATE',
      role: 'PROJECTOR',
      gameState: {
        ...state,
        remaining_seconds: this.remainingSeconds,
        timer_paused: this.timerPaused
      },
      activeQuestion,
      answerStats,
      leaderboard,
      podium,
      finalists,
      counts
    }));
  }

  sendHostSync(ws: WebSocket) {
    const state = dbManager.getGameState();
    const counts = dbManager.getPlayerCount();
    let activeQuestion: any = null;
    let answerStats: any = null;

    if (state.active_question_id) {
      const q = dbManager.getQuestion(state.active_question_id);
      if (q) {
        activeQuestion = q; // Host always sees full question info including correct answer
        answerStats = dbManager.getAnswerStats(q.id);
      }
    }

    const currentQuestions = dbManager.getQuestionsForLevel(state.current_level || 1, true);
    const leaderboard = dbManager.getLeaderboard(state.current_level || 1, 50);
    const finalists = dbManager.getTop10Finalists();
    const podium = dbManager.getFinalistPodium();

    const pillarAnswers = dbManager.getAllPillarAnswers();
    const allPlayers = dbManager.getAllPlayersForHost();

    ws.send(JSON.stringify({
      type: 'SYNC_STATE',
      role: 'HOST',
      gameState: {
        ...state,
        remaining_seconds: this.remainingSeconds,
        timer_paused: this.timerPaused
      },
      activeQuestion,
      answerStats,
      leaderboard,
      finalists,
      podium,
      counts,
      levelQuestions: currentQuestions,
      pillarAnswers,
      players: allPlayers
    }));
  }

  // --- Game Lifecycle Operations ---
  startLevel(level: number) {
    this.stopTimer();
    dbManager.updateGameState({
      current_level: level,
      game_status: 'LEVEL_INTRO',
      active_question_id: null,
      question_start_time: null
    });
    this.broadcastSyncToAll();
  }

  openQuestion(questionId: number) {
    const question = dbManager.getQuestion(questionId);
    if (!question) throw new Error('Question not found');

    this.stopTimer();
    this.remainingSeconds = question.time_limit_sec;
    this.timerPaused = false;

    dbManager.updateGameState({
      current_level: question.level,
      game_status: 'QUESTION_ACTIVE',
      active_question_id: question.id,
      question_start_time: Date.now(),
      question_duration_sec: question.time_limit_sec
    });

    // Start 1-second interval
    this.timerInterval = setInterval(() => {
      if (this.timerPaused) return;

      this.remainingSeconds--;
      if (this.remainingSeconds <= 0) {
        this.remainingSeconds = 0;
        this.lockQuestion();
      } else {
        this.broadcastToAll({
          type: 'TIMER_TICK',
          remainingSeconds: this.remainingSeconds
        });
      }
    }, 1000);

    this.broadcastSyncToAll();
  }

  pauseTimer() {
    this.timerPaused = true;
    dbManager.updateGameState({ game_status: 'PAUSED' });
    this.broadcastToAll({ type: 'TIMER_PAUSED' });
  }

  resumeTimer() {
    this.timerPaused = false;
    dbManager.updateGameState({ game_status: 'QUESTION_ACTIVE' });
    this.broadcastToAll({ type: 'TIMER_RESUMED', remainingSeconds: this.remainingSeconds });
  }

  extendTimer(seconds = 10) {
    this.remainingSeconds += seconds;
    this.broadcastToAll({ type: 'TIMER_EXTENDED', remainingSeconds: this.remainingSeconds });
  }

  lockQuestion() {
    this.stopTimer();
    dbManager.updateGameState({ game_status: 'QUESTION_LOCKED' });

    const state = dbManager.getGameState();
    let answerStats = null;
    if (state.active_question_id) {
      answerStats = dbManager.getAnswerStats(state.active_question_id);
    }

    this.broadcastToAll({
      type: 'QUESTION_LOCKED',
      answerStats
    });
    this.broadcastSyncToAll();
  }

  revealAnswer() {
    this.stopTimer();
    dbManager.updateGameState({ game_status: 'REVEAL' });

    const state = dbManager.getGameState();
    let q = null;
    let answerStats = null;
    if (state.active_question_id) {
      q = dbManager.getQuestion(state.active_question_id);
      answerStats = dbManager.getAnswerStats(state.active_question_id);
    }

    this.broadcastToAll({
      type: 'ANSWER_REVEALED',
      correct_option: q?.correct_option,
      explanation: q?.explanation,
      answerStats
    });
    this.broadcastSyncToAll();
  }

  showLeaderboard() {
    this.stopTimer();
    dbManager.updateGameState({ game_status: 'LEVEL_LEADERBOARD' });
    const state = dbManager.getGameState();
    const leaderboard = dbManager.getLeaderboard(state.current_level, 50);

    this.broadcastToAll({
      type: 'LEADERBOARD_UPDATE',
      level: state.current_level,
      leaderboard
    });
    this.broadcastSyncToAll();
  }

  executeCutoff(level: number) {
    if (level === 2) {
      const res = dbManager.executeCutoffLevel2(50);
      this.broadcastToAll({
        type: 'CUTOFF_ANNOUNCED',
        level: 2,
        qualifiedCount: res.qualifiedCount,
        cutOffScore: res.cutOffScore
      });
    } else if (level === 3) {
      const res = dbManager.executeCutoffLevel3(10);
      this.broadcastToAll({
        type: 'CUTOFF_ANNOUNCED',
        level: 3,
        qualifiedCount: res.qualifiedCount,
        cutOffScore: res.cutOffScore
      });
    }
    this.broadcastSyncToAll();
  }

  startBowserStage() {
    this.stopTimer();
    dbManager.updateGameState({
      current_level: 3,
      game_status: 'BOWSER_STAGE',
      active_question_id: null
    });
    const finalists = dbManager.getTop10Finalists();
    this.broadcastToAll({
      type: 'BOWSER_UPDATE',
      finalists
    });
    this.broadcastSyncToAll();
  }

  submitJudgeScore(scoreData: {
    finalist_id: string;
    judge_name: string;
    clarity_score: number;
    reasoning_score: number;
    judgement_score: number;
    communication_score: number;
    remarks?: string;
  }) {
    const res = dbManager.saveJudgeScore(scoreData);
    const podium = dbManager.getFinalistPodium();
    this.broadcastToHosts({
      type: 'JUDGE_SCORE_SAVED',
      finalist_id: scoreData.finalist_id,
      res,
      podium
    });
    this.broadcastToProjectors({
      type: 'JUDGE_SCORE_SAVED',
      podium
    });
  }

  finishAndShowPodium() {
    this.stopTimer();
    dbManager.updateGameState({ game_status: 'PODIUM_WINNERS' });
    const podium = dbManager.getFinalistPodium();
    this.broadcastToAll({
      type: 'PODIUM_REVEAL',
      podium
    });
    this.broadcastSyncToAll();
  }

  resetGame() {
    this.stopTimer();
    dbManager.resetGame();
    this.broadcastSyncToAll();
  }

  // --- Private Helpers ---
  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerPaused = false;
  }

  broadcastSyncToAll() {
    for (const [playerId, ws] of this.playerSockets.entries()) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(this.getPlayerSyncPayload(playerId)));
      }
    }
    for (const ws of this.projectorSockets) {
      if (ws.readyState === ws.OPEN) {
        this.sendProjectorSync(ws);
      }
    }
    for (const ws of this.hostSockets) {
      if (ws.readyState === ws.OPEN) {
        this.sendHostSync(ws);
      }
    }
  }
}

export const gameManager = new GameManager();

