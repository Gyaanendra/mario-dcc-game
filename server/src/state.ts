import type { WebSocket } from 'ws';
import { dbManager, DatabaseManager } from './db.js';
import type { Question, Player, GameStateRecord } from './types.js';

const publicPlayer = (player: Player) => ({
  id: player.id, name: player.name, avatar_id: player.avatar_id,
  student_id: player.student_id,
  level1_score: player.level1_score, level2_score: player.level2_score,
  level3_score: 0, total_coins: player.total_coins,
  is_qualified_level2: player.is_qualified_level2, is_qualified_level3: player.is_qualified_level3,
  completed_pipes: player.completed_pipes ?? 0
});
const privatePlayer = (player: Player | undefined, showFinalScore: boolean) => {
  if (!player) return null;
  const { session_token_hash, ...safe } = player;
  return { ...safe, level3_score: showFinalScore ? safe.level3_score : 0 };
};
const publicQuestion = (question: Question, reveal: boolean) => ({
  id: question.id, level: question.level, category: question.category,
  prompt: question.prompt, option_a: question.option_a, option_b: question.option_b,
  option_c: question.option_c, option_d: question.option_d, points: question.points,
  time_limit_sec: question.time_limit_sec, sort_order: question.sort_order, is_practice: question.is_practice,
  correct_option: reveal ? question.correct_option : null,
  explanation: reveal ? question.explanation : null
});

export class GameManager {
  private playerSockets = new Map<string, WebSocket>();
  private pipeReadyPlayers = new Set<string>();
  private pipeIndices = new Map<string, number>();
  private hostSockets = new Set<WebSocket>();
  private projectorSockets = new Set<WebSocket>();
  private clock: NodeJS.Timeout;

  constructor(private db: DatabaseManager = dbManager) {
    const state = db.getGameState();
    // A restart never silently resumes a question or a speaker's clock.
    if (state.game_status === 'QUESTION_ACTIVE' || state.game_status === 'PAUSED') {
      db.updateGameState({ game_status: 'QUESTION_LOCKED', deadline_at: null, remaining_ms: 0, paused_at: null });
      if (state.active_question_id) db.markQuestionClosed(state.active_question_id);
    }
    if (state.speaker_running) {
      db.updateGameState({ speaker_running: 0, speaker_deadline_at: null,
        speaker_remaining_ms: Math.max(0, (state.speaker_deadline_at || Date.now()) - Date.now()) } as any);
    }
    this.clock = setInterval(() => this.tick(), 250);
    this.clock.unref();
  }

  close() { clearInterval(this.clock); }
  private send(ws: WebSocket, payload: unknown) { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload)); }
  private broadcast(sockets: Iterable<WebSocket>, payload: unknown) { for (const ws of sockets) this.send(ws, payload); }
  broadcastToHosts(payload: unknown) { this.broadcast(this.hostSockets, payload); }
  broadcastToProjectors(payload: unknown) { this.broadcast(this.projectorSockets, payload); }
  private broadcastPlayers(payload: unknown) { this.broadcast(this.playerSockets.values(), payload); }

  registerPlayerSocket(id: string, ws: WebSocket) {
    const old = this.playerSockets.get(id);
    if (old && old !== ws) old.close(4001, 'Session opened on another device');
    this.playerSockets.set(id, ws);
    if (this.pipeReadyPlayers.delete(id)) this.broadcastPipeReadyCount();
    this.pipeIndices.delete(id);
    this.db.setPlayerConnection(id, true);
    this.broadcastCounts();
  }
  unregisterPlayerSocket(id: string, ws: WebSocket) {
    if (this.playerSockets.get(id) === ws) {
      this.playerSockets.delete(id);
      this.pipeReadyPlayers.delete(id);
      this.pipeIndices.delete(id);
      this.db.setPlayerConnection(id, false);
      this.broadcastCounts();
      this.broadcastPipeReadyCount();
    }
  }
  disconnectPlayer(id: string) { this.playerSockets.get(id)?.close(4002, 'Session moved to another phone'); }
  registerHostSocket(ws: WebSocket) { this.hostSockets.add(ws); this.sendHostSync(ws); }
  unregisterHostSocket(ws: WebSocket) { this.hostSockets.delete(ws); }
  registerProjectorSocket(ws: WebSocket) { this.projectorSockets.add(ws); this.sendProjectorSync(ws); }
  unregisterProjectorSocket(ws: WebSocket) { this.projectorSockets.delete(ws); }
  private broadcastCounts() {
    const counts = this.db.getPlayerCount();
    this.broadcastToHosts({ type: 'COUNTS_UPDATE', totalRegistered: counts.total, connectedPlayers: counts.connected });
    this.broadcastToProjectors({ type: 'COUNTS_UPDATE', totalRegistered: counts.total, connectedPlayers: counts.connected });
  }
  private broadcastPipeReadyCount() {
    const payload = { type: 'PIPE_READY_COUNT', count: this.pipeReadyPlayers.size };
    this.broadcastToHosts(payload);
    this.broadcastToProjectors(payload);
  }
  setPipeReady(id: string, ready: boolean, pipeIndex?: number) {
    const player = this.db.getPlayerById(id);
    if (!player) throw new Error('Join before entering a pipe');
    const level = this.db.getGameState().current_level;
    const eligible = level < 2 || (level === 2 && !!player.is_qualified_level2) ||
      (level === 3 && !!player.is_qualified_level3);
    const wasReady = this.pipeReadyPlayers.has(id);
    if (ready && eligible) this.pipeReadyPlayers.add(id);
    else this.pipeReadyPlayers.delete(id);
    if (ready && eligible && Number.isInteger(pipeIndex) && pipeIndex! >= 0 && pipeIndex! < 10)
      this.pipeIndices.set(id, pipeIndex!);
    else this.pipeIndices.delete(id);
    if (wasReady !== this.pipeReadyPlayers.has(id)) {
      this.broadcastPipeReadyCount();
      const socket = this.playerSockets.get(id);
      if (socket) this.send(socket, this.getPlayerSyncPayload(id));
    }
    const socket = this.playerSockets.get(id);
    if (socket) this.send(socket, this.getPipeQuestPayload(id));
  }

  getPipeQuestPayload(id: string) {
    const state = this.db.getGameState();
    const level = state.current_level || 1;
    const questions = this.db.getPipeQuestQuestions(level);
    const progress = this.db.getPipeQuestProgress(id);
    const pipeIndex = this.pipeIndices.get(id);
    const question = pipeIndex !== undefined &&
      pipeIndex === progress.completedPipes && this.pipeReadyPlayers.has(id) ? questions[pipeIndex] : undefined;
    return { type: 'PIPE_QUEST_STATE', totalPipes: questions.length,
      ...progress, nextPipeIndex: Math.min(progress.completedPipes, questions.length),
      question: question ? { ...publicQuestion(question, false), pipeIndex } : null };
  }

  submitPipeQuestAnswer(id: string, pipeIndex: number, questionId: number, option: string, responseTimeMs: number = 0) {
    const state = this.db.getGameState();
    if (state.game_status === 'ENDED' || state.game_status === 'PODIUM_WINNERS')
      throw new Error('The event has concluded');
    const level = state.current_level || 1;
    const questions = this.db.getPipeQuestQuestions(level);
    const progress = this.db.getPipeQuestProgress(id);
    const question = questions[pipeIndex];
    if (!question || pipeIndex !== progress.completedPipes || question.id !== questionId ||
      this.pipeIndices.get(id) !== pipeIndex || !this.pipeReadyPlayers.has(id))
      throw new Error('Reach the next pipe before answering');
    const result = this.db.submitPipeQuestAnswer(id, pipeIndex, question, option, responseTimeMs);
    this.broadcastSyncToAll();
    return { type: 'PIPE_QUEST_RESULT', pipeIndex, question: { ...publicQuestion(question, true), pipeIndex },
      ...result, ...this.db.getPipeQuestProgress(id) };
  }

  claimFlagpoleBonus(id: string) {
    const state = this.db.getGameState();
    const level = state.current_level || 1;
    const progress = this.db.getPipeQuestProgress(id);
    const totalPipes = this.db.getPipeQuestQuestions(level).length;
    if (progress.completedPipes < totalPipes) {
      return { type: 'FLAGPOLE_RESULT', success: false, message: 'Complete all pillars before grabbing the flagpole' };
    }
    const already = this.db.hasFlagpoleClaimed(id, level);
    if (already) {
      return { type: 'FLAGPOLE_RESULT', success: false, alreadyClaimed: true };
    }
    const finishOrder = this.db.getFlagpoleFinishCount(level) + 1;
    const bonus = finishOrder <= 3 ? 200 : finishOrder <= 10 ? 150 : 100;
    this.db.recordFlagpoleClaim(id, level, bonus, finishOrder);
    this.broadcastSyncToAll();
    return { type: 'FLAGPOLE_RESULT', success: true, bonus, finishOrder };
  }

  private remainingMs(state: GameStateRecord) {
    if (state.game_status === 'QUESTION_ACTIVE' && state.deadline_at) return Math.max(0, state.deadline_at - Date.now());
    return Math.max(0, state.remaining_ms || 0);
  }
  private speakerRemainingMs(state: GameStateRecord) {
    if (state.speaker_running && state.speaker_deadline_at) return Math.max(0, state.speaker_deadline_at - Date.now());
    return Math.max(0, state.speaker_remaining_ms || 0);
  }
  private wireState(state: GameStateRecord) {
    return { ...state, remaining_seconds: Math.ceil(this.remainingMs(state) / 1000),
      remaining_ms: this.remainingMs(state), timer_paused: state.game_status === 'PAUSED',
      speaker_remaining_ms: this.speakerRemainingMs(state) };
  }
  private activeQuestion(state: GameStateRecord, reveal: boolean) {
    const question = state.active_question_id ? this.db.getQuestion(state.active_question_id) : undefined;
    return question ? publicQuestion(question, reveal) : null;
  }
  private cutoffState(state: GameStateRecord) {
    return this.db.getCutoffState(state.current_level === 1 ? 2 : 3);
  }
  getPlayerSyncPayload(id: string) {
    const state = this.db.getGameState();
    const player = this.db.getPlayerById(id);
    const question = state.active_question_id ? this.db.getQuestion(state.active_question_id) : undefined;
    const answer = question ? this.db.getPlayerAnswer(id, question.id) : undefined;
    const reveal = state.game_status === 'REVEAL';
    const cutoff = this.cutoffState(state);
    const isEligible = !!player && !!question && this.isEligible(player, question, cutoff?.pendingIds || []);
    const isAtPipe = this.pipeReadyPlayers.has(id);
    const canAnswer = isEligible && isAtPipe && state.game_status === 'QUESTION_ACTIVE' && this.remainingMs(state) > 0 && !answer;
    return { type: 'SYNC_STATE', role: 'PLAYER', gameState: this.wireState(state),
      player: privatePlayer(player, state.game_status === 'PODIUM_WINNERS'),
      activeQuestion: isEligible && isAtPipe ? this.activeQuestion(state, reveal) : null,
      canAnswer, isSpectator: !!question && !isEligible, tiePending: cutoff?.status === 'PENDING',
      myAnswer: answer ? { selected_option: answer.selected_option,
        is_correct: reveal ? answer.is_correct : null, coins_awarded: reveal ? answer.coins_awarded : null } : null };
  }
  sendProjectorSync(ws: WebSocket) {
    const state = this.db.getGameState();
    const showStats = ['QUESTION_LOCKED', 'REVEAL'].includes(state.game_status);
    const readiness = this.db.getResultReadiness();
    this.send(ws, { type: 'SYNC_STATE', role: 'PROJECTOR', gameState: this.wireState(state),
      activeQuestion: this.activeQuestion(state, state.game_status === 'REVEAL'),
      answerStats: showStats && state.active_question_id ? this.db.getAnswerStats(state.active_question_id) : null,
      leaderboard: this.db.getLeaderboard(state.current_level || 1, 50).map(publicPlayer),
      finalists: this.db.getTop10Finalists().map(publicPlayer),
      podium: state.game_status === 'PODIUM_WINNERS' ? this.db.getFinalistPodium().map(({ student_id, ...rest }) => rest) : [],
      counts: this.db.getPlayerCount(), pipeReadyCount: this.pipeReadyPlayers.size,
      publicJoinUrl: process.env.PUBLIC_JOIN_URL || null,
      judgeReadiness: { completed: readiness.completed, expected: readiness.expected,
        followUpRequired: readiness.ties.length > 0 } });
  }
  sendHostSync(ws: WebSocket) {
    const state = this.db.getGameState();
    const activeQuestion = state.active_question_id ? this.db.getQuestion(state.active_question_id) : null;
    const cutoff = this.cutoffState(state);
    this.send(ws, { type: 'SYNC_STATE', role: 'HOST', gameState: this.wireState(state), activeQuestion,
      answerStats: activeQuestion ? this.db.getAnswerStats(activeQuestion.id) : null,
      leaderboard: this.db.getLeaderboard(state.current_level || 1, 150),
      finalists: this.db.getTop10Finalists(), podium: this.db.getFinalistPodium(),
      counts: this.db.getPlayerCount(), pipeReadyCount: this.pipeReadyPlayers.size,
      judgeMatrix: this.db.getJudgeMatrix(), levelQuestions: [
        ...(state.current_level <= 1 && this.db.getPracticeQuestion() ? [this.db.getPracticeQuestion()] : []),
        ...this.db.getQuestionsForLevel(state.current_level || 1)
      ], cutoff, judgeNames: this.db.getJudgeNames(), judgeReadiness: this.db.getResultReadiness() });
  }
  broadcastSyncToAll() {
    for (const [id, ws] of this.playerSockets) this.send(ws, this.getPlayerSyncPayload(id));
    for (const ws of this.projectorSockets) this.sendProjectorSync(ws);
    for (const ws of this.hostSockets) this.sendHostSync(ws);
  }

  private tick() {
    const state = this.db.getGameState();
    if (state.game_status === 'QUESTION_ACTIVE') {
      const remaining = this.remainingMs(state);
      if (remaining <= 0) this.lockQuestion();
      else if (Math.ceil(remaining / 1000) !== Math.ceil((remaining + 250) / 1000)) {
        const payload = { type: 'TIMER_TICK', remainingSeconds: Math.ceil(remaining / 1000) };
        this.broadcastPlayers(payload); this.broadcastToHosts(payload); this.broadcastToProjectors(payload);
      }
    }
    if (state.speaker_running) {
      const remaining = this.speakerRemainingMs(state);
      if (remaining <= 0) this.speakerPause(true);
      else if (Math.ceil(remaining / 1000) !== Math.ceil((remaining + 250) / 1000)) {
        const payload = { type: 'SPEAKER_TICK', remainingMs: remaining };
        this.broadcastToHosts(payload); this.broadcastToProjectors(payload);
      }
    }
  }

  private isEligible(player: Player, question: Question, tieIds: string[]) {
    if (question.category === 'SUDDEN_DEATH') return tieIds.includes(player.id);
    if (question.is_practice) return true;
    if (question.level === 1) return true;
    if (question.level === 2) return !!player.is_qualified_level2;
    return false;
  }
  submitAnswer(id: string, questionId: number, option: string) {
    const state = this.db.getGameState();
    const player = this.db.getPlayerById(id);
    const question = this.db.getQuestion(questionId);
    if (!player || !question || state.game_status !== 'QUESTION_ACTIVE' || state.active_question_id !== questionId || this.remainingMs(state) <= 0)
      throw new Error('This question is closed');
    const cutoff = this.cutoffState(state);
    if (!this.isEligible(player, question, cutoff?.pendingIds || [])) throw new Error('You are watching this round as a spectator');
    if (!this.pipeReadyPlayers.has(id)) throw new Error('Stand on a pipe to unlock this question');
    const elapsedMs = Math.max(0, Date.now() - (state.question_start_time || Date.now()));
    const result = this.db.submitAnswer(id, question, option, elapsedMs);
    if (!result.alreadyAnswered) {
      const stats = this.db.getAnswerStats(questionId);
      this.broadcastToHosts({ type: 'LIVE_SUBMISSION_STATS', stats });
      this.broadcastToProjectors({ type: 'LIVE_SUBMISSION_COUNT', count: stats.total });
    }
    return result;
  }

  startLevel(level: number) {
    const state = this.db.getGameState();
    if (![1, 2].includes(level)) throw new Error('Choose Level 1 or Level 2');
    if (level === 1 && state.game_status !== 'LOBBY') throw new Error('Level 1 can only start from the lobby');
    if (level === 2 && state.current_level !== 1) throw new Error('Finish Level 1 before starting Level 2');
    if (level === 2 && this.db.getCutoffState(2)?.status !== 'COMPLETE') throw new Error('Finish the top 50 cut-off first');
    if (state.game_status === 'QUESTION_ACTIVE') throw new Error('Lock the current question first');
    this.db.updateGameState({ current_level: level, game_status: 'LEVEL_INTRO', active_question_id: null,
      question_start_time: null, deadline_at: null, remaining_ms: 0, sudden_death_active: 0 });
    this.pipeReadyPlayers.clear();
    this.pipeIndices.clear();
    this.broadcastSyncToAll();
  }
  openQuestion(questionId: number) {
    const state = this.db.getGameState();
    const question = this.db.getQuestion(questionId);
    if (!question) throw new Error('Question not found');
    if (state.game_status === 'QUESTION_ACTIVE' || state.game_status === 'PAUSED') throw new Error('Lock the current question first');
    if (question.category === 'SUDDEN_DEATH') throw new Error('Use the sudden-death control for tie questions');
    if (question.level !== state.current_level) throw new Error('Question belongs to a different level');
    if (this.db.getCutoffState(question.level + 1)) throw new Error('This level has already reached its cut-off');
    if (this.db.getAnswerStats(question.id).total) throw new Error('Question has already been played');
    this.db.markQuestionOpened(question.id);
    const now = Date.now();
    this.db.updateGameState({ game_status: 'QUESTION_ACTIVE', active_question_id: question.id,
      question_start_time: now, question_duration_sec: question.time_limit_sec, deadline_at: now + question.time_limit_sec * 1000,
      remaining_ms: question.time_limit_sec * 1000, paused_at: null, sudden_death_active: 0 });
    this.broadcastSyncToAll();
  }
  pauseTimer() {
    const state = this.db.getGameState();
    if (state.game_status !== 'QUESTION_ACTIVE') throw new Error('No active question to pause');
    this.db.updateGameState({ game_status: 'PAUSED', remaining_ms: this.remainingMs(state), deadline_at: null, paused_at: Date.now() });
    this.broadcastSyncToAll();
  }
  resumeTimer() {
    const state = this.db.getGameState();
    if (state.game_status !== 'PAUSED') throw new Error('Question is not paused');
    const now = Date.now();
    this.db.updateGameState({ game_status: 'QUESTION_ACTIVE', deadline_at: now + state.remaining_ms,
      question_start_time: (state.question_start_time || now) + now - (state.paused_at || now), paused_at: null });
    this.broadcastSyncToAll();
  }
  extendTimer(seconds = 10) {
    const state = this.db.getGameState();
    if (!['QUESTION_ACTIVE', 'PAUSED'].includes(state.game_status) || !Number.isInteger(seconds) || seconds < 1 || seconds > 60)
      throw new Error('Timer can be extended by 1–60 seconds while a question is open');
    this.db.updateGameState({ deadline_at: state.deadline_at ? state.deadline_at + seconds * 1000 : null,
      remaining_ms: this.remainingMs(state) + seconds * 1000, question_duration_sec: state.question_duration_sec + seconds });
    this.broadcastSyncToAll();
  }
  lockQuestion() {
    const state = this.db.getGameState();
    if (!['QUESTION_ACTIVE', 'PAUSED'].includes(state.game_status)) throw new Error('No open question');
    this.db.updateGameState({ game_status: 'QUESTION_LOCKED', deadline_at: null, remaining_ms: 0, paused_at: null });
    if (state.active_question_id) this.db.markQuestionClosed(state.active_question_id);
    if (state.sudden_death_active && state.active_question_id) {
      const result = this.db.resolveTieQuestion(state.current_level + 1, state.active_question_id);
      if (result?.status === 'COMPLETE') this.broadcastPlayers({ type: 'CUTOFF_ANNOUNCED', level: state.current_level + 1 });
    }
    this.broadcastSyncToAll();
  }
  revealAnswer() {
    const state = this.db.getGameState();
    if (state.game_status !== 'QUESTION_LOCKED') throw new Error('Lock the question before revealing');
    this.db.updateGameState({ game_status: 'REVEAL' });
    this.broadcastSyncToAll();
  }
  voidCurrentQuestion() {
    const state = this.db.getGameState();
    if (!state.active_question_id || !['QUESTION_LOCKED', 'REVEAL'].includes(state.game_status) || state.sudden_death_active)
      throw new Error('Only a locked regular question can be voided');
    if (this.db.getCutoffState(state.current_level + 1)) throw new Error('The cut-off has already begun');
    this.db.voidQuestion(state.active_question_id);
    this.db.updateGameState({ game_status: 'LEVEL_INTRO', active_question_id: null, question_start_time: null,
      remaining_ms: 0, deadline_at: null });
    this.broadcastSyncToAll();
  }
  showLeaderboard() {
    const state = this.db.getGameState();
    if (state.game_status === 'QUESTION_ACTIVE' || state.game_status === 'PAUSED') throw new Error('Lock the question first');
    if (this.db.getPlayedQuestionIds(state.current_level).length < this.db.countQuestionsInLevel(state.current_level))
      throw new Error('Complete every scored question in this level before the cut-off');
    this.db.updateGameState({ game_status: 'LEVEL_LEADERBOARD' });
    this.broadcastSyncToAll();
  }
  executeCutoff(level: number) {
    const state = this.db.getGameState();
    if (level !== state.current_level + 1 || ![2, 3].includes(level)) throw new Error('Cut-off does not match the current level');
    if (state.game_status === 'QUESTION_ACTIVE' || state.game_status === 'PAUSED') throw new Error('Lock the question first');
    if (this.db.getPlayedQuestionIds(state.current_level).length < this.db.countQuestionsInLevel(state.current_level))
      throw new Error('Complete every scored question in this level before the cut-off');
    const result = level === 2 ? this.db.executeCutoffLevel2() : this.db.executeCutoffLevel3();
    this.broadcastSyncToAll();
    return result;
  }
  triggerSuddenDeath() {
    const state = this.db.getGameState();
    const level = state.current_level + 1;
    if (state.game_status === 'QUESTION_ACTIVE' || state.game_status === 'PAUSED') throw new Error('Lock the current question first');
    const question = this.db.getNextTieQuestion(level);
    this.db.markQuestionOpened(question.id);
    const now = Date.now();
    this.db.updateGameState({ game_status: 'QUESTION_ACTIVE', active_question_id: question.id,
      question_start_time: now, question_duration_sec: question.time_limit_sec,
      deadline_at: now + question.time_limit_sec * 1000, remaining_ms: question.time_limit_sec * 1000,
      paused_at: null, sudden_death_active: 1 });
    this.broadcastSyncToAll();
  }
  startBowserStage() {
    if (this.db.getCutoffState(3)?.status !== 'COMPLETE') throw new Error('Finish the top 10 cut-off first');
    this.db.updateGameState({ current_level: 3, game_status: 'BOWSER_STAGE', active_question_id: null,
      deadline_at: null, remaining_ms: 0, speaker_id: null, speaker_remaining_ms: 120000, speaker_running: 0 });
    this.pipeReadyPlayers.clear();
    this.pipeIndices.clear();
    this.broadcastSyncToAll();
  }
  selectSpeaker(id: string) {
    if (this.db.getGameState().game_status !== 'BOWSER_STAGE' || !this.db.getPlayerById(id)?.is_qualified_level3)
      throw new Error('Choose a qualified finalist during the boss stage');
    this.db.updateGameState({ speaker_id: id, speaker_running: 0, speaker_deadline_at: null, speaker_remaining_ms: 120000 } as any);
    this.broadcastSyncToAll();
  }
  speakerStart() {
    const state = this.db.getGameState();
    if (state.game_status !== 'BOWSER_STAGE' || !state.speaker_id) throw new Error('Select a finalist first');
    if (state.speaker_running) return;
    this.db.updateGameState({ speaker_running: 1, speaker_deadline_at: Date.now() + state.speaker_remaining_ms } as any);
    this.broadcastSyncToAll();
  }
  speakerPause(expired = false) {
    const state = this.db.getGameState();
    if (!state.speaker_running) return;
    this.db.updateGameState({ speaker_running: 0, speaker_deadline_at: null,
      speaker_remaining_ms: expired ? 0 : this.speakerRemainingMs(state) } as any);
    this.broadcastSyncToAll();
  }
  speakerReset() {
    if (this.db.getGameState().game_status !== 'BOWSER_STAGE') throw new Error('Not in the boss stage');
    this.db.updateGameState({ speaker_running: 0, speaker_deadline_at: null, speaker_remaining_ms: 120000 } as any);
    this.broadcastSyncToAll();
  }
  submitJudgeScore(data: Parameters<DatabaseManager['saveJudgeScore']>[0]) {
    if (this.db.getGameState().game_status !== 'BOWSER_STAGE') throw new Error('Judging is open only during the boss stage');
    this.db.saveJudgeScore(data); this.broadcastSyncToAll();
  }
  submitFinalTiebreak(data: Parameters<DatabaseManager['saveFinalTiebreak']>[0]) {
    if (this.db.getGameState().game_status !== 'BOWSER_STAGE') throw new Error('Follow-up scoring is open only during the boss stage');
    this.db.saveFinalTiebreak(data); this.broadcastSyncToAll();
  }
  verifyResults() {
    if (this.db.getGameState().game_status !== 'BOWSER_STAGE') throw new Error('Results can only be verified during the boss stage');
    const readiness = this.db.getResultReadiness();
    if (!readiness.ready) throw new Error('Complete every judge score and resolve podium ties before verification');
    this.db.updateGameState({ results_verified: 1 } as any);
    this.broadcastSyncToAll();
  }
  finishAndShowPodium() {
    const state = this.db.getGameState();
    if (state.game_status !== 'BOWSER_STAGE' || !state.results_verified || !this.db.getResultReadiness().ready)
      throw new Error('Verified final results are required before the podium');
    this.db.updateGameState({ game_status: 'PODIUM_WINNERS', speaker_running: 0, speaker_deadline_at: null } as any);
    this.broadcastSyncToAll();
  }
  resetGame(wipePlayers: boolean = false) {
    this.db.resetGame(wipePlayers);
    this.pipeReadyPlayers.clear();
    this.pipeIndices.clear();

    if (wipePlayers) {
      for (const [, ws] of this.playerSockets) {
        this.send(ws, {
          type: 'SESSION_EXPIRED',
          message: 'The event host has reset the event and cleared player registrations.'
        });
        try { ws.close(); } catch {}
      }
      this.playerSockets.clear();
    }

    this.broadcastSyncToAll();
    this.broadcastCounts();
    this.broadcastPipeReadyCount();

    if (!wipePlayers) {
      for (const [id, ws] of this.playerSockets) {
        this.send(ws, this.getPipeQuestPayload(id));
      }
    }
  }
}

export const gameManager = new GameManager();
