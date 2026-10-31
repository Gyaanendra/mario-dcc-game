import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { GameStateRecord, Player, Question, PlayerAnswer, JudgeScore, GameStatus } from './types.js';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'mario_quest.db');

export class DatabaseManager {
  private db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(DB_PATH);
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        last_ping_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        sort_order INTEGER DEFAULT 0
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

      CREATE TABLE IF NOT EXISTS pillar_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        pillar_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        selected_option TEXT NOT NULL,
        is_correct INTEGER DEFAULT 0,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(player_id, pillar_id),
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
    `);

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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1;

      UPDATE players SET
        level1_score = 0,
        level2_score = 0,
        level3_score = 0,
        is_qualified_level2 = 0,
        is_qualified_level3 = 0;

      DELETE FROM player_answers;
      DELETE FROM judge_scores;
      DELETE FROM pillar_answers;
    `);
  }

  // --- Player Methods ---
  getOrCreatePlayer(studentId: string, name: string, avatarId: string): Player {
    const existing = this.db.prepare(`
      SELECT *, (level1_score + level2_score + CAST(level3_score AS INTEGER)) as total_coins
      FROM players WHERE student_id = ?
    `).get(studentId) as unknown as Player | undefined;

    if (existing) {
      this.db.prepare(`
        UPDATE players SET name = ?, avatar_id = ?, is_connected = 1, last_ping_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, avatarId, existing.id);
      return { ...existing, name, avatar_id: avatarId, is_connected: 1 };
    }

    const id = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO players (id, student_id, name, avatar_id, is_connected, level1_score, level2_score, level3_score, is_qualified_level2, is_qualified_level3)
      VALUES (?, ?, ?, ?, 1, 0, 0, 0, 0, 0)
    `).run(id, studentId.trim().toUpperCase(), name.trim(), avatarId);

    return this.getPlayerById(id)!;
  }

  getPlayerById(id: string): Player | undefined {
    return this.db.prepare(`
      SELECT *, (level1_score + level2_score + CAST(level3_score AS INTEGER)) as total_coins
      FROM players WHERE id = ?
    `).get(id) as unknown as Player | undefined;
  }

  setPlayerConnection(id: string, isConnected: boolean) {
    this.db.prepare('UPDATE players SET is_connected = ?, last_ping_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(isConnected ? 1 : 0, id);
  }

  getAllPlayers(): Player[] {
    return this.db.prepare(`
      SELECT *, (level1_score + level2_score + CAST(level3_score AS INTEGER)) as total_coins
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
    return this.db.prepare("SELECT * FROM questions WHERE level = ? AND category != 'SUDDEN_DEATH' ORDER BY sort_order ASC, id ASC").all(level) as unknown as Question[];
  }

  getSuddenDeathQuestions(): Question[] {
    return this.db.prepare("SELECT * FROM questions WHERE category = 'SUDDEN_DEATH' ORDER BY id ASC").all() as unknown as Question[];
  }

  countQuestionsInLevel(level: number): number {
    const res = this.db.prepare("SELECT COUNT(*) as cnt FROM questions WHERE level = ? AND category != 'SUDDEN_DEATH'").get(level) as { cnt: number };
    return res?.cnt || 0;
  }

  // --- Answers & Scoring Methods ---
  submitAnswer(playerId: string, questionId: number, selectedOption: string, responseTimeMs: number): { isCorrect: boolean; coinsAwarded: number; alreadyAnswered: boolean } {
    const question = this.getQuestion(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const existing = this.db.prepare('SELECT * FROM player_answers WHERE player_id = ? AND question_id = ?').get(playerId, questionId);
    if (existing) {
      return { isCorrect: false, coinsAwarded: 0, alreadyAnswered: true };
    }

    const isCorrect = selectedOption.toUpperCase() === question.correct_option.toUpperCase();
    let coinsAwarded = 0;

    if (isCorrect) {
      // Base points + small speed bonus (up to 20 bonus points if answered quickly)
      const maxTimeMs = question.time_limit_sec * 1000;
      const speedFactor = Math.max(0, 1 - (responseTimeMs / maxTimeMs));
      const speedBonus = Math.round(speedFactor * 20);
      coinsAwarded = question.points + speedBonus;
    }

    this.db.prepare(`
      INSERT INTO player_answers (player_id, question_id, selected_option, is_correct, response_time_ms, coins_awarded)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(playerId, questionId, selectedOption.toUpperCase(), isCorrect ? 1 : 0, responseTimeMs, coinsAwarded);

    // Update player score for that level
    const scoreCol = question.level === 1 ? 'level1_score' : 'level2_score';
    this.db.prepare(`
      UPDATE players SET ${scoreCol} = ${scoreCol} + ?, last_ping_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(coinsAwarded, playerId);

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
    let orderCol = 'level1_score';
    if (level === 2) orderCol = '(level1_score + level2_score)';
    if (level >= 3) orderCol = '(level1_score + level2_score + CAST(level3_score AS INTEGER))';

    return this.db.prepare(`
      SELECT id, student_id, name, avatar_id, level1_score, level2_score, level3_score,
             (level1_score + level2_score + CAST(level3_score AS INTEGER)) as total_coins,
             is_qualified_level2, is_qualified_level3
      FROM players
      ORDER BY ${orderCol} DESC, last_ping_at ASC
      LIMIT ?
    `).all(limit) as unknown as Player[];
  }

  executeCutoffLevel2(topN: number = 50): { qualifiedCount: number; cutOffScore: number } {
    // Reset all
    this.db.exec('UPDATE players SET is_qualified_level2 = 0');

    // Select top N by level1_score
    const topPlayers = this.db.prepare(`
      SELECT id, level1_score FROM players
      ORDER BY level1_score DESC, last_ping_at ASC
      LIMIT ?
    `).all(topN) as { id: string; level1_score: number }[];

    if (topPlayers.length === 0) return { qualifiedCount: 0, cutOffScore: 0 };

    for (const p of topPlayers) {
      this.db.prepare('UPDATE players SET is_qualified_level2 = 1 WHERE id = ?').run(p.id);
    }

    const cutOffScore = topPlayers[topPlayers.length - 1].level1_score;
    return { qualifiedCount: topPlayers.length, cutOffScore };
  }

  executeCutoffLevel3(topN: number = 10): { qualifiedCount: number; cutOffScore: number } {
    // Reset all
    this.db.exec('UPDATE players SET is_qualified_level3 = 0');

    // Select top N by cumulative level1 + level2
    const topPlayers = this.db.prepare(`
      SELECT id, (level1_score + level2_score) as total
      FROM players
      WHERE is_qualified_level2 = 1
      ORDER BY total DESC, last_ping_at ASC
      LIMIT ?
    `).all(topN) as { id: string; total: number }[];

    if (topPlayers.length === 0) return { qualifiedCount: 0, cutOffScore: 0 };

    for (const p of topPlayers) {
      this.db.prepare('UPDATE players SET is_qualified_level3 = 1 WHERE id = ?').run(p.id);
    }

    const cutOffScore = topPlayers[topPlayers.length - 1].total;
    return { qualifiedCount: topPlayers.length, cutOffScore };
  }

  getTop10Finalists(): Player[] {
    return this.db.prepare(`
      SELECT id, student_id, name, avatar_id, level1_score, level2_score, level3_score,
             (level1_score + level2_score + CAST(level3_score AS INTEGER)) as total_coins
      FROM players
      WHERE is_qualified_level3 = 1
      ORDER BY (level1_score + level2_score + CAST(level3_score AS INTEGER)) DESC
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

    return { total, avgScore };
  }

  // --- Pillar Answer Methods ---
  submitPillarAnswer(playerId: string, pillarId: number, questionId: number, selectedOption: string, isCorrect: boolean) {
    const existing = this.db.prepare('SELECT id FROM pillar_answers WHERE player_id = ? AND pillar_id = ?').get(playerId, pillarId);
    if (existing) return null;
    this.db.prepare(
      'INSERT INTO pillar_answers (player_id, pillar_id, question_id, selected_option, is_correct) VALUES (?, ?, ?, ?, ?)'
    ).run(playerId, pillarId, questionId, selectedOption, isCorrect ? 1 : 0);
    return { playerId, pillarId, questionId, selectedOption, isCorrect };
  }

  getPillarAnswersForPlayer(playerId: string) {
    return this.db.prepare('SELECT * FROM pillar_answers WHERE player_id = ? ORDER BY pillar_id').all(playerId) as unknown as any[];
  }

  getAllPillarAnswers() {
    return this.db.prepare(`
      SELECT pa.*, p.name as player_name, p.student_id
      FROM pillar_answers pa
      JOIN players p ON pa.player_id = p.id
      ORDER BY pa.submitted_at DESC
    `).all() as unknown as any[];
  }

  getAllPlayersForHost() {
    return this.db.prepare(`
      SELECT id, student_id, name, avatar_id, is_connected,
             level1_score, level2_score, level3_score,
             is_qualified_level2, is_qualified_level3,
             created_at, last_ping_at
      FROM players ORDER BY created_at DESC
    `).all() as unknown as any[];
  }

  getFinalistPodium(): { rank: number; name: string; student_id: string; avatar_id: string; total_score: number; coins: number }[] {
    const finalists = this.db.prepare(`
      SELECT id, student_id, name, avatar_id, level1_score, level2_score, level3_score,
             (level1_score + level2_score + CAST(level3_score AS INTEGER)) as coins
      FROM players
      WHERE is_qualified_level3 = 1
      ORDER BY level3_score DESC, coins DESC
      LIMIT 10
    `).all() as unknown as (Player & { coins: number })[];

    return finalists.map((f, idx) => ({
      rank: idx + 1,
      name: f.name,
      student_id: f.student_id,
      avatar_id: f.avatar_id,
      total_score: Number(f.level3_score.toFixed(1)),
      coins: f.coins
    }));
  }
}

export const dbManager = new DatabaseManager();

