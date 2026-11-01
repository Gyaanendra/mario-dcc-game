import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseManager } from './db.js';
import { GameManager } from './state.js';

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'mcq-test-'));
  const db = new DatabaseManager(path.join(dir, 'test.db'));
  const raw = (db as any).db;
  const insert = raw.prepare(`INSERT INTO questions (level,category,prompt,option_a,option_b,correct_option,points,time_limit_sec,sort_order,is_practice)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  insert.run(1, 'PRACTICE', 'Practice', 'Yes', 'No', 'A', 0, 20, -1, 1);
  insert.run(1, 'CAREER_BASICS', 'Career basics', 'Yes', 'No', 'A', 100, 25, 1, 0);
  insert.run(2, 'RED FLAG', 'Red flag', 'Yes', 'No', 'A', 100, 25, 1, 0);
  insert.run(1, 'SUDDEN_DEATH', 'Tie 1', 'Yes', 'No', 'A', 0, 15, 99, 0);
  insert.run(2, 'SUDDEN_DEATH', 'Tie 2', 'Yes', 'No', 'A', 0, 15, 99, 0);
  const manager = new GameManager(db);
  return { db, manager, raw, cleanup: () => { manager.close(); raw.close(); rmSync(dir, { recursive: true, force: true }); } };
}
const player = (db: DatabaseManager, suffix: string) => db.createPlayer(`ROLL${suffix}`, `Player ${suffix}`, 'mario').player;

test('lobby pipe quest uses seeded questions, reveals immediately, and leaves event coins untouched', () => {
  const x = fixture();
  try {
    x.raw.prepare(`INSERT INTO questions (level,category,prompt,option_a,option_b,correct_option,points,time_limit_sec,sort_order,is_practice)
      VALUES (1,'CAREER_BASICS','Second pipe','Yes','No','B',100,25,2,0)`).run();
    const p = player(x.db, 'PIPE');
    assert.equal(x.manager.getPipeQuestPayload(p.id).question, null);
    x.manager.setPipeReady(p.id, true, 0);
    const unlocked = x.manager.getPipeQuestPayload(p.id);
    assert.equal(unlocked.question?.prompt, 'Career basics');
    assert.equal(unlocked.question?.correct_option, null);
    assert.throws(() => x.manager.submitPipeQuestAnswer(p.id, 1, 2, 'A'), /next pipe/);
    const result = x.manager.submitPipeQuestAnswer(p.id, 0, 2, 'B');
    assert.equal(result.isCorrect, false);
    assert.equal(result.question.correct_option, 'A');
    assert.equal(x.manager.getPipeQuestPayload(p.id).nextPipeIndex, 1);
    assert.equal(x.manager.getPipeQuestPayload(p.id).question, null);
    assert.equal(x.db.getPlayerById(p.id)?.level1_score, 0);
    assert.throws(() => x.manager.submitPipeQuestAnswer(p.id, 0, 2, 'A'), /next pipe/);
    x.manager.setPipeReady(p.id, false);
    x.manager.setPipeReady(p.id, true, 1);
    assert.equal(x.manager.getPipeQuestPayload(p.id).question?.prompt, 'Second pipe');
  } finally { x.cleanup(); }
});

test('practice is unscored, answers lock once, and reveal hides key until lock', () => {
  const x = fixture();
  try {
    const p = player(x.db, 'ONE');
    x.manager.startLevel(1);
    x.manager.openQuestion(1);
    const before = x.manager.getPlayerSyncPayload(p.id);
    assert.equal(before.activeQuestion, null);
    assert.equal(before.canAnswer, false);
    assert.throws(() => x.manager.submitAnswer(p.id, 1, 'A'), /Stand on a pipe/);
    x.manager.setPipeReady(p.id, true);
    assert.equal(x.manager.getPlayerSyncPayload(p.id).activeQuestion?.correct_option, null);
    assert.equal(x.manager.getPlayerSyncPayload(p.id).canAnswer, true);
    assert.equal(x.manager.submitAnswer(p.id, 1, 'A').coinsAwarded, 0);
    assert.equal(x.manager.getPlayerSyncPayload(p.id).canAnswer, false);
    assert.equal(x.manager.getPlayerSyncPayload(p.id).isSpectator, false);
    assert.equal(x.manager.submitAnswer(p.id, 1, 'B').alreadyAnswered, true);
    assert.equal(x.db.getPlayerById(p.id)?.level1_score, 0);
    x.manager.lockQuestion();
    x.manager.revealAnswer();
    assert.equal(x.manager.getPlayerSyncPayload(p.id).activeQuestion?.correct_option, 'A');
    x.manager.setPipeReady(p.id, false);
    assert.equal(x.manager.getPlayerSyncPayload(p.id).activeQuestion, null);
  } finally { x.cleanup(); }
});

test('session token restores identity; roll number alone cannot take over', () => {
  const x = fixture();
  try {
    const joined = x.db.createPlayer('roll2', 'Player Two', 'mario');
    assert.equal(x.db.getPlayerBySessionToken(joined.sessionToken)?.id, joined.player.id);
    assert.equal(x.db.getPlayerBySessionToken(joined.player.id), undefined);
    assert.throws(() => x.db.createPlayer('ROLL2', 'Imposter', 'mario'), /already registered/);
  } finally { x.cleanup(); }
});

test('cut-off tie requires sudden death and server rejects spectators', () => {
  const x = fixture();
  try {
    const a = player(x.db, 'A'), b = player(x.db, 'B'), c = player(x.db, 'C');
    const q = x.db.getQuestion(2)!;
    x.db.submitAnswer(a.id, q, 'A', 0);
    x.db.submitAnswer(b.id, q, 'A', 0);
    x.manager.startLevel(1);
    assert.equal(x.db.executeCutoffLevel2(1).status, 'PENDING');
    x.manager.triggerSuddenDeath();
    assert.throws(() => x.manager.submitAnswer(c.id, 4, 'A'), /spectator/);
    x.manager.setPipeReady(a.id, true);
    x.manager.setPipeReady(b.id, true);
    x.manager.submitAnswer(a.id, 4, 'A');
    x.manager.submitAnswer(b.id, 4, 'B');
    x.manager.lockQuestion();
    assert.equal(x.db.getCutoffState(2)?.status, 'COMPLETE');
    assert.equal(x.db.getPlayerById(a.id)?.is_qualified_level2, 1);
    assert.equal(x.db.getPlayerById(b.id)?.is_qualified_level2, 0);
    x.manager.revealAnswer();
    x.manager.startLevel(2);
    x.manager.openQuestion(3);
    assert.throws(() => x.manager.submitAnswer(b.id, 3, 'A'), /spectator/);
  } finally { x.cleanup(); }
});

test('Level 2 score alone selects finalists and judge tie needs a follow-up', () => {
  const x = fixture();
  try {
    const a = player(x.db, 'ALPHA'), b = player(x.db, 'BETA');
    x.raw.prepare('UPDATE players SET level1_score = ?, level2_score = ? WHERE id = ?').run(500, 100, a.id);
    x.raw.prepare('UPDATE players SET level1_score = ?, level2_score = ? WHERE id = ?').run(100, 200, b.id);
    x.manager.startLevel(1);
    assert.equal(x.db.executeCutoffLevel2(2).status, 'COMPLETE');
    x.manager.startLevel(2);
    assert.equal(x.db.executeCutoffLevel3(1).status, 'COMPLETE');
    assert.equal(x.db.getPlayerById(b.id)?.is_qualified_level3, 1);
    assert.equal(x.db.getPlayerById(a.id)?.is_qualified_level3, 0);
    // Expand the final to both players to test equal rubric scores.
    x.raw.prepare('UPDATE players SET is_qualified_level3 = 1 WHERE id = ?').run(a.id);
    x.manager.startBowserStage();
    for (const finalist of [a, b]) x.manager.submitJudgeScore({ finalist_id: finalist.id, judge_name: 'DCC Judge',
      clarity_score: 4, reasoning_score: 4, judgement_score: 4, communication_score: 4 });
    assert.equal(x.db.getResultReadiness().ready, false);
    assert.throws(() => x.manager.finishAndShowPodium(), /Verified/);
    x.manager.submitFinalTiebreak({ finalist_id: a.id, judge_name: 'DCC Judge', round_no: 1, clarity_score: 5, reasoning_score: 5 });
    assert.equal(x.db.getResultReadiness().ready, false);
    x.manager.submitFinalTiebreak({ finalist_id: b.id, judge_name: 'DCC Judge', round_no: 1, clarity_score: 4, reasoning_score: 4 });
    assert.equal(x.db.getResultReadiness().ready, true);
    x.manager.verifyResults();
    x.manager.finishAndShowPodium();
    assert.equal(x.db.getFinalistPodium()[0].name, a.name);
  } finally { x.cleanup(); }
});

test('restart locks an active question and pauses speaker clock', () => {
  const x = fixture();
  try {
    player(x.db, 'RESTART');
    x.manager.startLevel(1);
    x.manager.openQuestion(2);
    const restarted = new GameManager(x.db);
    assert.equal(x.db.getGameState().game_status, 'QUESTION_LOCKED');
    restarted.close();
  } finally { x.cleanup(); }
});

test('cut-offs require every scored question and voiding restores scores for replay', () => {
  const x = fixture();
  try {
    const p = player(x.db, 'REPLAY');
    x.manager.startLevel(1);
    assert.throws(() => x.manager.executeCutoff(2), /Complete every scored question/);
    x.manager.openQuestion(2);
    x.manager.setPipeReady(p.id, true);
    x.manager.submitAnswer(p.id, 2, 'A');
    assert.ok(x.db.getPlayerById(p.id)!.level1_score >= 100);
    x.manager.lockQuestion();
    x.manager.voidCurrentQuestion();
    assert.equal(x.db.getPlayerById(p.id)?.level1_score, 0);
    assert.throws(() => x.manager.executeCutoff(2), /Complete every scored question/);
    x.manager.openQuestion(2);
    x.manager.submitAnswer(p.id, 2, 'A');
    x.manager.lockQuestion();
    x.manager.revealAnswer();
    x.manager.showLeaderboard();
    assert.equal(x.manager.executeCutoff(2).status, 'COMPLETE');
  } finally { x.cleanup(); }
});

test('two named judges must score every finalist and their totals are averaged', () => {
  const previous = process.env.JUDGE_NAMES;
  process.env.JUDGE_NAMES = 'Judge One,Judge Two';
  const x = fixture();
  try {
    const a = player(x.db, 'JUDGEA'), b = player(x.db, 'JUDGEB');
    x.manager.startLevel(1);
    x.db.executeCutoffLevel2(2);
    x.manager.startLevel(2);
    x.db.executeCutoffLevel3(2);
    x.manager.startBowserStage();
    const score = (id: string, judge: string, value: number) => x.manager.submitJudgeScore({
      finalist_id: id, judge_name: judge, clarity_score: value, reasoning_score: value,
      judgement_score: value, communication_score: value
    });
    score(a.id, 'Judge One', 5);
    score(b.id, 'Judge One', 3);
    assert.equal(x.db.getResultReadiness().completed, 2);
    assert.equal(x.db.getResultReadiness().ready, false);
    score(a.id, 'Judge Two', 3);
    score(b.id, 'Judge Two', 3);
    assert.equal(x.db.getPlayerById(a.id)?.level3_score, 16);
    assert.equal(x.db.getPlayerById(b.id)?.level3_score, 12);
    assert.equal(x.db.getPlayerById(a.id)?.total_coins, 0);
    assert.equal(x.db.getResultReadiness().ready, true);
    assert.equal(x.db.getJudgeMatrix().length, 4);
    x.manager.verifyResults();
    x.manager.finishAndShowPodium();
    assert.equal(x.db.getFinalistPodium()[0].name, a.name);
  } finally {
    x.cleanup();
    if (previous === undefined) delete process.env.JUDGE_NAMES; else process.env.JUDGE_NAMES = previous;
  }
});

test('pause freezes answer intake, resume restores it, and extension changes the deadline', () => {
  const x = fixture();
  try {
    const p = player(x.db, 'TIMER');
    x.manager.startLevel(1);
    x.manager.openQuestion(2);
    x.manager.setPipeReady(p.id, true);
    const original = x.db.getGameState().deadline_at!;
    x.manager.pauseTimer();
    assert.equal(x.db.getGameState().game_status, 'PAUSED');
    assert.throws(() => x.manager.submitAnswer(p.id, 2, 'A'), /closed/);
    x.manager.extendTimer(10);
    x.manager.resumeTimer();
    assert.ok(x.db.getGameState().deadline_at! >= original + 9000);
    assert.equal(x.manager.submitAnswer(p.id, 2, 'A').alreadyAnswered, false);
  } finally { x.cleanup(); }
});

test('a server restart pauses a running finalist clock', () => {
  const x = fixture();
  try {
    const p = player(x.db, 'SPEAKER');
    x.manager.startLevel(1);
    x.db.executeCutoffLevel2(1);
    x.manager.startLevel(2);
    x.db.executeCutoffLevel3(1);
    x.manager.startBowserStage();
    x.manager.selectSpeaker(p.id);
    x.manager.speakerStart();
    assert.equal(x.db.getGameState().speaker_running, 1);
    const restarted = new GameManager(x.db);
    assert.equal(x.db.getGameState().speaker_running, 0);
    assert.ok(x.db.getGameState().speaker_remaining_ms > 0);
    restarted.close();
  } finally { x.cleanup(); }
});

test('50-player and 10-player boundaries include no tied extra place', () => {
  const x = fixture();
  try {
    const players = Array.from({ length: 51 }, (_, index) => player(x.db, `BOUND${index}`));
    const setScore = x.raw.prepare('UPDATE players SET level1_score = ?, level2_score = ? WHERE id = ?');
    players.forEach((p, index) => setScore.run(1000 - Math.min(index, 49), 0, p.id));
    x.manager.startLevel(1);
    assert.equal(x.db.executeCutoffLevel2().status, 'PENDING');
    assert.equal(x.db.getCutoffState(2)?.safeIds.length, 49);
    assert.equal(x.db.getCutoffState(2)?.pendingIds.length, 2);
    x.manager.triggerSuddenDeath();
    x.manager.setPipeReady(players[49].id, true);
    x.manager.setPipeReady(players[50].id, true);
    x.manager.submitAnswer(players[49].id, 4, 'A');
    x.manager.submitAnswer(players[50].id, 4, 'B');
    x.manager.lockQuestion();
    assert.equal(x.db.getCutoffState(2)?.safeIds.length, 50);
    assert.equal(x.db.getPlayerById(players[50].id)?.is_qualified_level2, 0);
    x.manager.revealAnswer();
    x.manager.startLevel(2);
    players.slice(0, 50).forEach((p, index) => setScore.run(1000 - index, 1000 - Math.min(index, 9), p.id));
    assert.equal(x.db.executeCutoffLevel3().status, 'PENDING');
    assert.equal(x.db.getCutoffState(3)?.safeIds.length, 9);
    assert.equal(x.db.getCutoffState(3)?.pendingIds.length, 41);
    x.manager.triggerSuddenDeath();
    x.manager.setPipeReady(players[9].id, true);
    x.manager.submitAnswer(players[9].id, 5, 'A');
    x.manager.lockQuestion();
    assert.equal(x.db.getCutoffState(3)?.status, 'COMPLETE');
    assert.equal(x.db.getTop10Finalists().length, 10);
    assert.equal(x.db.getPlayerById(players[10].id)?.is_qualified_level3, 0);
  } finally { x.cleanup(); }
});
