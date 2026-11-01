import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { GameStateRecord, Player, Question, PlayerAnswer, JudgeScore, GameStatus } from './types.js';

const DB_DIR = path.resolve(process.env.DATA_DIR || path.resolve(process.cwd(), 'data'));
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'mario_quest.db');
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export class DatabaseManager {
  private db: DatabaseSync;

  constructor(dbPath = DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    this.initPragmas();
    this.initSchema();
  }

  private initPragmas() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -2000;
      PRAGMA temp_store = MEMORY;
    `);
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_level INTEGER DEFAULT 0,
        game_status TEXT DEFAULT 'LOBBY',
        active_question_id INTEGER,
        question_start_time INTEGER,
        question_duration_sec INTEGER DEFAULT 25,
        sudden_death_active INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deadline_at INTEGER,
        remaining_ms INTEGER DEFAULT 0,
        paused_at INTEGER,
        speaker_id TEXT,
        speaker_deadline_at INTEGER,
        speaker_remaining_ms INTEGER DEFAULT 120000,
        speaker_running INTEGER DEFAULT 0,
        results_verified INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        avatar_id TEXT DEFAULT 'mario',
        is_connected INTEGER DEFAULT 1,
        level1_score INTEGER DEFAULT 0,
        level2_score INTEGER DEFAULT 0,
        level3_score REAL DEFAULT 0,
        is_qualified_level2 INTEGER DEFAULT 0,
        is_qualified_level3 INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_ping_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_token_hash TEXT
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level INTEGER NOT NULL,
        category TEXT DEFAULT 'GENERAL',
        prompt TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT,
        option_d TEXT,
        correct_option TEXT NOT NULL,
        explanation TEXT,
        points INTEGER DEFAULT 100,
        time_limit_sec INTEGER DEFAULT 25,
        sort_order INTEGER DEFAULT 0,
        is_practice INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS player_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        question_id INTEGER NOT NULL,
        selected_option TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        response_time_ms INTEGER NOT NULL,
        coins_awarded INTEGER NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(player_id, question_id),
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(question_id) REFERENCES questions(id)
      );

      CREATE TABLE IF NOT EXISTS pipe_quest_answers (
        player_id TEXT NOT NULL,
        pipe_index INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        selected_option TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(player_id, pipe_index),
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(question_id) REFERENCES questions(id)
      );

      CREATE TABLE IF NOT EXISTS flagpole_finishes (
        player_id TEXT NOT NULL,
        level INTEGER NOT NULL,
        bonus INTEGER NOT NULL,
        finish_order INTEGER NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(player_id, level),
        FOREIGN KEY(player_id) REFERENCES players(id)
      );

      CREATE TABLE IF NOT EXISTS judge_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        finalist_id TEXT NOT NULL,
        judge_name TEXT NOT NULL,
        clarity_score INTEGER DEFAULT 0,
        reasoning_score INTEGER DEFAULT 0,
        judgement_score INTEGER DEFAULT 0,
        communication_score INTEGER DEFAULT 0,
        total_score REAL DEFAULT 0,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(finalist_id, judge_name),
        FOREIGN KEY(finalist_id) REFERENCES players(id)
      );

      CREATE TABLE IF NOT EXISTS cutoff_state (
        level INTEGER PRIMARY KEY,
        target_count INTEGER NOT NULL,
        safe_ids TEXT NOT NULL,
        pending_ids TEXT NOT NULL,
        next_question_index INTEGER DEFAULT 0,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS final_tiebreak_scores (
        finalist_id TEXT NOT NULL,
        judge_name TEXT NOT NULL,
        round_no INTEGER NOT NULL,
        clarity_score INTEGER NOT NULL CHECK(clarity_score BETWEEN 0 AND 5),
        reasoning_score INTEGER NOT NULL CHECK(reasoning_score BETWEEN 0 AND 5),
        PRIMARY KEY(finalist_id, judge_name, round_no)
      );
      CREATE TABLE IF NOT EXISTS opened_questions (
        question_id INTEGER PRIMARY KEY,
        opened_at INTEGER NOT NULL,
        closed_at INTEGER
      );
    `);

    // Upgrade databases created by the original app without discarding event data.
    const additions: Record<string, Record<string, string>> = {
      game_state: {
        deadline_at: 'INTEGER', remaining_ms: 'INTEGER DEFAULT 0', paused_at: 'INTEGER',
        speaker_id: 'TEXT', speaker_deadline_at: 'INTEGER', speaker_remaining_ms: 'INTEGER DEFAULT 120000',
        speaker_running: 'INTEGER DEFAULT 0', results_verified: 'INTEGER DEFAULT 0'
      },
      players: { session_token_hash: 'TEXT' },
      questions: { is_practice: 'INTEGER DEFAULT 0' }
    };
    for (const [table, columns] of Object.entries(additions)) {
      const existing = new Set((this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name));
      for (const [column, definition] of Object.entries(columns)) {
        if (!existing.has(column)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    }

    // Ensure initial game_state record exists
    const state = this.db.prepare('SELECT * FROM game_state WHERE id = 1').get();
    if (!state) {
      this.db.exec(`
        INSERT INTO game_state (id, current_level, game_status, active_question_id, question_duration_sec, sudden_death_active)
        VALUES (1, 0, 'LOBBY', NULL, 25, 0);
      `);
    }
  }

  // --- Game State Methods ---
  getGameState(): GameStateRecord {
    return this.db.prepare('SELECT * FROM game_state WHERE id = 1').get() as unknown as GameStateRecord;
  }

  updateGameState(updates: Partial<GameStateRecord>) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(val as any);
      }
    }

    if (fields.length === 0) return;
    fields.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE game_state SET ${fields.join(', ')} WHERE id = 1`;
    this.db.prepare(sql).run(...values);
  }

  resetGame() {
    this.db.exec(`
      UPDATE game_state SET
        current_level = 0,
        game_status = 'LOBBY',
        active_question_id = NULL,
        question_start_time = NULL,
        sudden_death_active = 0,
        deadline_at = NULL,
        remaining_ms = 0,
        paused_at = NULL,
        speaker_id = NULL,
        speaker_deadline_at = NULL,
        speaker_remaining_ms = 120000,
        speaker_running = 0,
        results_verified = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1;

      UPDATE players SET
        level1_score = 0,
        level2_score = 0,
        level3_score = 0,
        is_qualified_level2 = 0,
        is_qualified_level3 = 0;

      DELETE FROM player_answers;
      DELETE FROM pipe_quest_answers;
      DELETE FROM judge_scores;
      DELETE FROM cutoff_state;
      DELETE FROM final_tiebreak_scores;
      DELETE FROM opened_questions;
    `);
  }

  // --- Player Methods ---
  createPlayer(studentId: string, name: string, avatarId: string): { player: Player; sessionToken: string } {
    const normalizedId = studentId.trim().toUpperCase();
    const normalizedName = name.trim();
    if (!/^[A-Z0-9@._-]{3,80}$/.test(normalizedId) || normalizedName.length < 2 || normalizedName.length > 60) {
      throw new Error('Enter a valid roll number or email and a display name of 2–60 characters');
    }
    const existing = this.db.prepare(`
      SELECT *, (level1_score + level2_score) as total_coins
      FROM players WHERE student_id = ?
    `).get(normalizedId) as unknown as Player | undefined;

    if (existing) throw new Error('This roll number is already registered. Reopen the original phone to reconnect, or ask the event host for help.');

    const id = crypto.randomUUID();
    const sessionToken = randomBytes(32).toString('base64url');
    this.db.prepare(`
      INSERT INTO players (id, student_id, name, avatar_id, is_connected, level1_score, level2_score, level3_score, is_qualified_level2, is_qualified_level3, session_token_hash)
      VALUES (?, ?, ?, ?, 1, 0, 0, 0, 0, 0, ?)
    `).run(id, normalizedId, normalizedName, avatarId === 'luigi' ? 'luigi' : 'mario', tokenHash(sessionToken));

    return { player: this.getPlayerById(id)!, sessionToken };
  }

  getPlayerBySessionToken(token: string): Player | undefined {
    if (typeof token !== 'string' || token.length < 32 || token.length > 128) return undefined;
    return this.db.prepare(`
      SELECT *, (level1_score + level2_score) as total_coins
      FROM players WHERE session_token_hash = ?
    `).get(tokenHash(token)) as unknown as Player | undefined;
  }

  reissueSession(studentId: string): { sessionToken: string; playerId: string } {
    const normalizedId = studentId.trim().toUpperCase();
    const row = this.db.prepare('SELECT id FROM players WHERE student_id = ?').get(normalizedId) as { id: string } | undefined;
    if (!row) throw new Error('Player not found');
    const token = randomBytes(32).toString('base64url');
    const result = this.db.prepare('UPDATE players SET session_token_hash = ? WHERE student_id = ?')
      .run(tokenHash(token), normalizedId);
    if (!result.changes) throw new Error('Player not found');
    return { sessionToken: token, playerId: row.id };
  }

  getPlayerById(id: string): Player | undefined {
    return this.db.prepare(`
      SELECT *, (level1_score + level2_score) as total_coins
      FROM players WHERE id = ?
    `).get(id) as unknown as Player | undefined;
  }

  setPlayerConnection(id: string, isConnected: boolean) {
    this.db.prepare('UPDATE players SET is_connected = ?, last_ping_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(isConnected ? 1 : 0, id);
  }

  getAllPlayers(): Player[] {
    return this.db.prepare(`
      SELECT *, (level1_score + level2_score) as total_coins
      FROM players ORDER BY total_coins DESC
    `).all() as unknown as Player[];
  }

  getPlayerCount(): { total: number; connected: number } {
    const res = this.db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN is_connected = 1 THEN 1 ELSE 0 END) as connected
      FROM players
    `).get() as { total: number; connected: number | null };
    return { total: res?.total || 0, connected: res?.connected || 0 };
  }

  // --- Question Methods ---
  getQuestion(id: number): Question | undefined {
    return this.db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as unknown as Question | undefined;
  }

  getQuestionsForLevel(level: number, includeSuddenDeath = false): Question[] {
    if (includeSuddenDeath) {
      return this.db.prepare("SELECT * FROM questions WHERE level = ? OR category = 'SUDDEN_DEATH' ORDER BY sort_order ASC, id ASC").all(level) as unknown as Question[];
    }
    return this.db.prepare("SELECT * FROM questions WHERE level = ? AND category != 'SUDDEN_DEATH' AND is_practice = 0 ORDER BY sort_order ASC, id ASC").all(level) as unknown as Question[];
  }

  getPracticeQuestion(): Question | undefined {
    return this.db.prepare('SELECT * FROM questions WHERE is_practice = 1 LIMIT 1').get() as unknown as Question | undefined;
  }

  getPipeQuestQuestions(level: number = 1): Question[] {
    return this.getQuestionsForLevel(level).filter(q => !q.is_practice && q.category !== 'SUDDEN_DEATH').slice(0, 10);
  }

  getPipeQuestProgress(playerId: string): { completedPipes: number; correctCount: number } {
    const row = this.db.prepare(`SELECT COUNT(*) AS completedPipes,
      COALESCE(SUM(is_correct), 0) AS correctCount FROM pipe_quest_answers WHERE player_id = ?`)
      .get(playerId) as { completedPipes: number; correctCount: number };
    return row;
  }

  submitPipeQuestAnswer(playerId: string, pipeIndex: number, question: Question, selectedOption: string, responseTimeMs: number = 0) {
    const option = selectedOption.toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(option) || !(question as any)[`option_${option.toLowerCase()}`])
      throw new Error('Choose one of the available answer options');
    const isCorrect = option === question.correct_option.toUpperCase();
    const state = this.getGameState();
    let coinsAwarded = 0;
    if (state.current_level >= 1 && isCorrect && !question.is_practice) {
      const basePoints = question.points || 100;
      const speedFactor = Math.max(0, 1 - (Math.max(0, responseTimeMs) / 20000));
      const speedBonus = Math.round(speedFactor * 50);
      coinsAwarded = basePoints + speedBonus;
    }

    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare(`INSERT OR REPLACE INTO pipe_quest_answers
        (player_id, pipe_index, question_id, selected_option, is_correct) VALUES (?, ?, ?, ?, ?)`)
        .run(playerId, pipeIndex, question.id, option, isCorrect ? 1 : 0);

      this.db.prepare(`INSERT OR REPLACE INTO player_answers
        (player_id, question_id, selected_option, is_correct, response_time_ms, coins_awarded)
        VALUES (?, ?, ?, ?, ?, ?)`)
        .run(playerId, question.id, option, isCorrect ? 1 : 0, Math.floor(responseTimeMs), coinsAwarded);

      if (coinsAwarded > 0) {
        const scoreCol = state.current_level === 1 ? 'level1_score' : 'level2_score';
        this.db.prepare(`UPDATE players SET ${scoreCol} = ${scoreCol} + ?, last_ping_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(coinsAwarded, playerId);
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }

    return { selectedOption: option, isCorrect, coinsAwarded };
  }

  hasFlagpoleClaimed(playerId: string, level: number): boolean {
    const row = this.db.prepare('SELECT 1 FROM flagpole_finishes WHERE player_id = ? AND level = ?').get(playerId, level);
    return !!row;
  }

  getFlagpoleFinishCount(level: number): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM flagpole_finishes WHERE level = ?').get(level) as { count: number };
    return row?.count || 0;
  }

  recordFlagpoleClaim(playerId: string, level: number, bonus: number, finishOrder: number) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare(`INSERT OR REPLACE INTO flagpole_finishes (player_id, level, bonus, finish_order) VALUES (?, ?, ?, ?)`)
        .run(playerId, level, bonus, finishOrder);
      if (bonus > 0) {
        const scoreCol = level === 1 ? 'level1_score' : 'level2_score';
        this.db.prepare(`UPDATE players SET ${scoreCol} = ${scoreCol} + ?, last_ping_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(bonus, playerId);
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  getSuddenDeathQuestions(level?: number): Question[] {
    if (level) return this.db.prepare("SELECT * FROM questions WHERE category = 'SUDDEN_DEATH' AND level = ? ORDER BY sort_order ASC, id ASC").all(level) as unknown as Question[];
    return this.db.prepare("SELECT * FROM questions WHERE category = 'SUDDEN_DEATH' ORDER BY sort_order ASC, id ASC").all() as unknown as Question[];
  }

  countQuestionsInLevel(level: number): number {
    const res = this.db.prepare("SELECT COUNT(*) as cnt FROM questions WHERE level = ? AND category != 'SUDDEN_DEATH' AND is_practice = 0").get(level) as { cnt: number };
    return res?.cnt || 0;
  }

  getPlayedQuestionIds(level: number): number[] {
    return (this.db.prepare(`SELECT opened_questions.question_id AS id FROM opened_questions
      JOIN questions ON questions.id = opened_questions.question_id
      WHERE questions.level = ? AND questions.category != 'SUDDEN_DEATH' AND questions.is_practice = 0
      AND opened_questions.closed_at IS NOT NULL`).all(level) as { id: number }[]).map(row => row.id);
  }
  markQuestionOpened(questionId: number) {
    if (this.db.prepare('SELECT 1 FROM opened_questions WHERE question_id = ?').get(questionId)) throw new Error('Question has already been played');
    this.db.prepare('INSERT INTO opened_questions (question_id, opened_at) VALUES (?, ?)').run(questionId, Date.now());
  }
  markQuestionClosed(questionId: number) {
    this.db.prepare('UPDATE opened_questions SET closed_at = ? WHERE question_id = ? AND closed_at IS NULL').run(Date.now(), questionId);
  }
  voidQuestion(questionId: number) {
    const question = this.getQuestion(questionId);
    if (!question || question.category === 'SUDDEN_DEATH') throw new Error('This question cannot be voided');
    const scoreColumn = question.level === 1 ? 'level1_score' : 'level2_score';
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const answers = this.db.prepare('SELECT player_id, coins_awarded FROM player_answers WHERE question_id = ?').all(questionId) as { player_id: string; coins_awarded: number }[];
      const subtract = this.db.prepare(`UPDATE players SET ${scoreColumn} = ${scoreColumn} - ? WHERE id = ?`);
      for (const answer of answers) if (answer.coins_awarded) subtract.run(answer.coins_awarded, answer.player_id);
      this.db.prepare('DELETE FROM player_answers WHERE question_id = ?').run(questionId);
      this.db.prepare('DELETE FROM opened_questions WHERE question_id = ?').run(questionId);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  // --- Answers & Scoring Methods ---
  submitAnswer(playerId: string, question: Question, selectedOption: string, responseTimeMs: number): { isCorrect: boolean; coinsAwarded: number; alreadyAnswered: boolean } {
    const option = selectedOption.toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(option) || !(question as any)[`option_${option.toLowerCase()}`]) {
      throw new Error('Invalid answer option');
    }

    const existing = this.db.prepare('SELECT * FROM player_answers WHERE player_id = ? AND question_id = ?').get(playerId, question.id);
    if (existing) {
      return { isCorrect: false, coinsAwarded: 0, alreadyAnswered: true };
    }

    const isCorrect = option === question.correct_option.toUpperCase();
    let coinsAwarded = 0;

    if (isCorrect && !question.is_practice && question.category !== 'SUDDEN_DEATH') {
      // Base points + small speed bonus (up to 20 bonus points if answered quickly)
      const maxTimeMs = question.time_limit_sec * 1000;
      const speedFactor = Math.max(0, 1 - (Math.max(0, responseTimeMs) / maxTimeMs));
      const speedBonus = Math.round(speedFactor * 20);
      coinsAwarded = question.points + speedBonus;
    }

    this.db.exec('BEGIN IMMEDIATE');
    try {
    this.db.prepare(`
      INSERT INTO player_answers (player_id, question_id, selected_option, is_correct, response_time_ms, coins_awarded)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(playerId, question.id, option, isCorrect ? 1 : 0, Math.max(0, Math.floor(responseTimeMs)), coinsAwarded);

    // Update player score for that level
    if (coinsAwarded > 0) {
      const scoreCol = question.level === 1 ? 'level1_score' : 'level2_score';
      this.db.prepare(`
      UPDATE players SET ${scoreCol} = ${scoreCol} + ?, last_ping_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `).run(coinsAwarded, playerId);
    }
    this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    return { isCorrect, coinsAwarded, alreadyAnswered: false };
  }

  getPlayerAnswer(playerId: string, questionId: number): PlayerAnswer | undefined {
    return this.db.prepare('SELECT * FROM player_answers WHERE player_id = ? AND question_id = ?').get(playerId, questionId) as unknown as PlayerAnswer | undefined;
  }

  getAnswerStats(questionId: number) {
    const rows = this.db.prepare(`
      SELECT selected_option, COUNT(*) as count
      FROM player_answers WHERE question_id = ?
      GROUP BY selected_option
    `).all(questionId) as { selected_option: string; count: number }[];

    const stats: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, total: 0 };
    for (const row of rows) {
      stats[row.selected_option] = row.count;
      stats.total += row.count;
    }
    return stats;
  }

  // --- Leaderboards & Cut-offs ---
  getLeaderboard(level: number = 1, limit: number = 50) {
    let orderCol = 'p.level1_score';
    let where = '';
    if (level === 2) orderCol = 'p.level2_score';
    if (level >= 3) orderCol = 'p.level3_score';
    if (level === 2) where = 'WHERE p.is_qualified_level2 = 1';
    if (level >= 3) where = 'WHERE p.is_qualified_level3 = 1';

    return this.db.prepare(`
      SELECT p.id, p.student_id, p.name, p.avatar_id, p.level1_score, p.level2_score, p.level3_score,
             (p.level1_score + p.level2_score) as total_coins,
             p.is_qualified_level2, p.is_qualified_level3,
             COALESCE(pq.completed_pipes, 0) as completed_pipes
      FROM players p
      LEFT JOIN (
        SELECT player_id, COUNT(*) as completed_pipes
        FROM pipe_quest_answers
        GROUP BY player_id
      ) pq ON pq.player_id = p.id
      ${where}
      ORDER BY ${orderCol} DESC, p.id ASC
      LIMIT ?
    `).all(limit) as unknown as Player[];
  }

  executeCutoffLevel2(topN = 50) { return this.prepareCutoff(2, topN); }
  executeCutoffLevel3(topN = 10) { return this.prepareCutoff(3, topN); }

  getCutoffState(level: number): { level: number; targetCount: number; safeIds: string[]; pendingIds: string[]; nextQuestionIndex: number; status: string } | null {
    const row = this.db.prepare('SELECT * FROM cutoff_state WHERE level = ?').get(level) as any;
    return row ? {
      level, targetCount: row.target_count, safeIds: JSON.parse(row.safe_ids),
      pendingIds: JSON.parse(row.pending_ids), nextQuestionIndex: row.next_question_index, status: row.status
    } : null;
  }

  private saveCutoff(level: number, targetCount: number, safeIds: string[], pendingIds: string[], nextQuestionIndex: number, status: string) {
    this.db.prepare(`INSERT INTO cutoff_state (level, target_count, safe_ids, pending_ids, next_question_index, status)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(level) DO UPDATE SET
      target_count=excluded.target_count, safe_ids=excluded.safe_ids, pending_ids=excluded.pending_ids,
      next_question_index=excluded.next_question_index, status=excluded.status`)
      .run(level, targetCount, JSON.stringify(safeIds), JSON.stringify(pendingIds), nextQuestionIndex, status);
  }

  private applyQualified(level: number, ids: string[]) {
    const column = level === 2 ? 'is_qualified_level2' : 'is_qualified_level3';
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.exec(`UPDATE players SET ${column} = 0`);
      const update = this.db.prepare(`UPDATE players SET ${column} = 1 WHERE id = ?`);
      for (const id of ids) update.run(id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private prepareCutoff(level: number, topN: number) {
    const existing = this.getCutoffState(level);
    if (existing) return { qualifiedCount: existing.safeIds.length, pendingCount: existing.pendingIds.length, status: existing.status };
    const scoreColumn = level === 2 ? 'level1_score' : 'level2_score';
    const where = level === 2 ? '' : 'WHERE is_qualified_level2 = 1';
    const rows = this.db.prepare(`SELECT id, ${scoreColumn} AS score FROM players ${where} ORDER BY score DESC, id ASC`).all() as { id: string; score: number }[];
    if (!rows.length) throw new Error('No players available for cut-off');
    const count = Math.min(topN, rows.length);
    const boundary = rows[count - 1].score;
    const hasTie = rows.length > count && rows[count].score === boundary;
    const safeIds = hasTie ? rows.filter(p => p.score > boundary).map(p => p.id) : rows.slice(0, count).map(p => p.id);
    const pendingIds = hasTie ? rows.filter(p => p.score === boundary).map(p => p.id) : [];
    const status = hasTie ? 'PENDING' : 'COMPLETE';
    this.saveCutoff(level, count, safeIds, pendingIds, 0, status);
    if (!hasTie) this.applyQualified(level, safeIds);
    return { qualifiedCount: safeIds.length, pendingCount: pendingIds.length, status };
  }

  getNextTieQuestion(level: number): Question {
    const cutoff = this.getCutoffState(level);
    if (!cutoff || cutoff.status !== 'PENDING') throw new Error('No cut-off tie is pending');
    const question = this.getSuddenDeathQuestions(level - 1)[cutoff.nextQuestionIndex];
    if (!question) throw new Error('No unused sudden-death question remains; add reviewed questions before continuing');
    this.saveCutoff(level, cutoff.targetCount, cutoff.safeIds, cutoff.pendingIds, cutoff.nextQuestionIndex + 1, cutoff.status);
    return question;
  }

  resolveTieQuestion(level: number, questionId: number) {
    const cutoff = this.getCutoffState(level);
    if (!cutoff || cutoff.status !== 'PENDING') return null;
    const remainingSlots = cutoff.targetCount - cutoff.safeIds.length;
    const pending = cutoff.pendingIds.map(id => ({ id, answer: this.getPlayerAnswer(id, questionId) }));
    const correct = pending.filter(p => p.answer?.is_correct).sort((a, b) => a.answer!.response_time_ms - b.answer!.response_time_ms);
    let safeIds = cutoff.safeIds;
    let pendingIds = cutoff.pendingIds;
    if (correct.length >= remainingSlots) {
      const boundaryTime = correct[remainingSlots - 1].answer!.response_time_ms;
      safeIds = [...safeIds, ...correct.filter(p => p.answer!.response_time_ms < boundaryTime).map(p => p.id)];
      pendingIds = correct.filter(p => p.answer!.response_time_ms === boundaryTime).map(p => p.id);
      if (safeIds.length + pendingIds.length === cutoff.targetCount) {
        safeIds = [...safeIds, ...pendingIds];
        pendingIds = [];
      }
    } else if (correct.length) {
      safeIds = [...safeIds, ...correct.map(p => p.id)];
      pendingIds = pending.filter(p => !p.answer?.is_correct).map(p => p.id);
    }
    const status = pendingIds.length ? 'PENDING' : 'COMPLETE';
    this.saveCutoff(level, cutoff.targetCount, safeIds, pendingIds, cutoff.nextQuestionIndex, status);
    if (status === 'COMPLETE') this.applyQualified(level, safeIds);
    return { status, qualifiedCount: safeIds.length, pendingCount: pendingIds.length };
  }

  getTop10Finalists(): Player[] {
    return this.db.prepare(`
      SELECT id, student_id, name, avatar_id, level1_score, level2_score, level3_score,
             (level1_score + level2_score) as total_coins
      FROM players
      WHERE is_qualified_level3 = 1
      ORDER BY level2_score DESC, id ASC
      LIMIT 10
    `).all() as unknown as Player[];
  }

  // --- Judge Matrix (Level 3 Bowser Challenge) ---
  saveJudgeScore(score: {
    finalist_id: string;
    judge_name: string;
    clarity_score: number;
    reasoning_score: number;
    judgement_score: number;
    communication_score: number;
    remarks?: string;
  }) {
    if (!this.getJudgeNames().includes(score.judge_name)) throw new Error('Judge is not in the configured roster');
    if (!this.getPlayerById(score.finalist_id)?.is_qualified_level3) throw new Error('Only finalists can be judged');
    for (const value of [score.clarity_score, score.reasoning_score, score.judgement_score, score.communication_score]) {
      if (!Number.isInteger(value) || value < 0 || value > 5) throw new Error('Rubric scores must be whole numbers from 0 to 5');
    }
    const total = score.clarity_score + score.reasoning_score + score.judgement_score + score.communication_score;
    this.db.prepare(`
      INSERT INTO judge_scores (finalist_id, judge_name, clarity_score, reasoning_score, judgement_score, communication_score, total_score, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(finalist_id, judge_name) DO UPDATE SET
        clarity_score = excluded.clarity_score,
        reasoning_score = excluded.reasoning_score,
        judgement_score = excluded.judgement_score,
        communication_score = excluded.communication_score,
        total_score = excluded.total_score,
        remarks = excluded.remarks,
        created_at = CURRENT_TIMESTAMP
    `).run(
      score.finalist_id,
      score.judge_name,
      score.clarity_score,
      score.reasoning_score,
      score.judgement_score,
      score.communication_score,
      total,
      score.remarks || ''
    );

    // Update average level3_score for this finalist
    const avgRes = this.db.prepare(`
      SELECT AVG(total_score) as avg_score FROM judge_scores WHERE finalist_id = ?
    `).get(score.finalist_id) as { avg_score: number | null };

    const avgScore = avgRes?.avg_score || 0;
    this.db.prepare('UPDATE players SET level3_score = ? WHERE id = ?').run(avgScore, score.finalist_id);
    this.db.exec('DELETE FROM final_tiebreak_scores');
    this.updateGameState({ results_verified: 0 } as any);

    return { total, avgScore };
  }

  getJudgeNames(): string[] {
    const names = (process.env.JUDGE_NAMES || 'DCC Judge').split(',').map(s => s.trim()).filter(Boolean);
    return [...new Set(names)];
  }

  getJudgeCompletion() {
    const judges = this.getJudgeNames();
    const finalists = this.getTop10Finalists();
    const scored = this.db.prepare('SELECT finalist_id, judge_name FROM judge_scores').all() as { finalist_id: string; judge_name: string }[];
    const missing = finalists.flatMap(player => judges.filter(judge => !scored.some(s => s.finalist_id === player.id && s.judge_name === judge))
      .map(judge => ({ finalistId: player.id, name: player.name, judge })));
    return { expected: finalists.length * judges.length, completed: finalists.length * judges.length - missing.length, missing };
  }

  getJudgeMatrix() {
    return this.db.prepare(`SELECT finalist_id, judge_name, clarity_score, reasoning_score,
      judgement_score, communication_score, total_score, remarks
      FROM judge_scores ORDER BY judge_name, finalist_id`).all() as {
      finalist_id: string; judge_name: string; clarity_score: number; reasoning_score: number;
      judgement_score: number; communication_score: number; total_score: number; remarks: string
    }[];
  }

  saveFinalTiebreak(score: { finalist_id: string; judge_name: string; round_no: number; clarity_score: number; reasoning_score: number }) {
    if (this.getJudgeCompletion().missing.length) throw new Error('Complete every judge rubric before the final follow-up');
    if (!this.getJudgeNames().includes(score.judge_name)) throw new Error('Judge is not in the configured roster');
    if (!this.getFinalTieCandidates().some(p => p.id === score.finalist_id)) throw new Error('Finalist is not in a podium tie');
    if (!Number.isInteger(score.round_no) || score.round_no < 1 || score.round_no > 20) throw new Error('Invalid follow-up round');
    for (const value of [score.clarity_score, score.reasoning_score]) {
      if (!Number.isInteger(value) || value < 0 || value > 5) throw new Error('Follow-up scores must be whole numbers from 0 to 5');
    }
    this.db.prepare(`INSERT INTO final_tiebreak_scores (finalist_id, judge_name, round_no, clarity_score, reasoning_score)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(finalist_id, judge_name, round_no) DO UPDATE SET
      clarity_score=excluded.clarity_score, reasoning_score=excluded.reasoning_score`)
      .run(score.finalist_id, score.judge_name, score.round_no, score.clarity_score, score.reasoning_score);
    this.updateGameState({ results_verified: 0 } as any);
  }

  private getFinalRanking() {
    const finalists = this.getTop10Finalists();
    const tieScores = this.db.prepare(`SELECT finalist_id, ROUND(AVG(clarity_score + reasoning_score), 3) AS tie_score,
      COUNT(*) AS score_count FROM final_tiebreak_scores GROUP BY finalist_id`).all() as { finalist_id: string; tie_score: number; score_count: number }[];
    return finalists.map(player => {
      const tie = tieScores.find(s => s.finalist_id === player.id);
      return { ...player, tie_score: tie?.tie_score ?? null, tie_score_count: tie?.score_count ?? 0 };
    }).sort((a, b) => b.level3_score - a.level3_score || (b.tie_score ?? -1) - (a.tie_score ?? -1) || a.id.localeCompare(b.id));
  }

  getFinalTieCandidates() {
    const ranked = this.getTop10Finalists().sort((a, b) => b.level3_score - a.level3_score || a.id.localeCompare(b.id));
    const judges = this.getJudgeNames();
    const rows = this.db.prepare('SELECT * FROM final_tiebreak_scores').all() as {
      finalist_id: string; judge_name: string; round_no: number; clarity_score: number; reasoning_score: number
    }[];
    const pending: Player[] = [];
    for (let start = 0; start < ranked.length;) {
      const end = ranked.findIndex((p, index) => index > start && p.level3_score !== ranked[start].level3_score);
      const stop = end < 0 ? ranked.length : end;
      const group = ranked.slice(start, stop);
      if (start < 3 && group.length > 1) {
        const groupRows = rows.filter(row => group.some(p => p.id === row.finalist_id));
        const lastRound = Math.max(0, ...groupRows.map(row => row.round_no));
        const complete = lastRound > 0 && group.every(p => judges.every(judge =>
          Array.from({ length: lastRound }, (_, index) => index + 1).every(round =>
            groupRows.some(row => row.finalist_id === p.id && row.judge_name === judge && row.round_no === round))));
        const rankedGroup = group.map(p => ({ player: p,
          score: groupRows.filter(row => row.finalist_id === p.id).reduce((sum, row) => sum + row.clarity_score + row.reasoning_score, 0) }))
          .sort((a, b) => b.score - a.score || a.player.id.localeCompare(b.player.id));
        const unresolved = !complete || rankedGroup.some((entry, index) =>
          index < rankedGroup.length - 1 && start + index < 3 && entry.score === rankedGroup[index + 1].score);
        if (unresolved) pending.push(...group);
      }
      start = stop;
    }
    return pending;
  }

  getResultReadiness() {
    const completion = this.getJudgeCompletion();
    const ties = completion.missing.length ? [] : this.getFinalTieCandidates().map(p => ({ id: p.id, name: p.name }));
    return { ...completion, ties, ready: completion.expected > 0 && !completion.missing.length && !ties.length };
  }

  getFinalistPodium(): { rank: number; name: string; student_id: string; avatar_id: string; total_score: number; coins: number }[] {
    const finalists = this.getFinalRanking();

    return finalists.map((f, idx) => ({
      rank: idx + 1,
      name: f.name,
      student_id: f.student_id,
      avatar_id: f.avatar_id,
      total_score: Number(f.level3_score.toFixed(1)),
      coins: f.total_coins,
      tie_score: f.tie_score
    }));
  }
}

export const dbManager = new DatabaseManager();

