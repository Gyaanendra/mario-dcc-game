import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { dbManager } from './db.js';

const outDir = process.env.FALLBACK_DIR;
if (!outDir) throw new Error('Set FALLBACK_DIR to the directory for printable fallback files');
mkdirSync(outDir, { recursive: true });
const csv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const writeCsv = (name: string, rows: unknown[][]) => writeFileSync(path.join(outDir, name), rows.map(row => row.map(csv).join(',')).join('\r\n') + '\r\n');
const questions = [dbManager.getPracticeQuestion(), ...dbManager.getQuestionsForLevel(1), ...dbManager.getQuestionsForLevel(2), ...dbManager.getSuddenDeathQuestions()].filter(Boolean);
if (questions.length < 41) throw new Error('Seed and review the full question bank before exporting');
writeCsv('questions-for-printing.csv', [
  ['Level', 'Category', 'Question', 'A', 'B', 'C', 'D', 'Time limit seconds', 'Practice / tie break'],
  ...questions.map(q => [q!.level, q!.category, q!.prompt, q!.option_a, q!.option_b, q!.option_c, q!.option_d,
    q!.time_limit_sec, q!.is_practice ? 'Practice' : q!.category === 'SUDDEN_DEATH' ? 'Tie break' : 'Scored'])
]);
writeCsv('private-answer-key.csv', [
  ['Level', 'Category', 'Question', 'Correct option', 'Explanation'],
  ...questions.map(q => [q!.level, q!.category, q!.prompt, q!.correct_option, q!.explanation])
]);
writeCsv('manual-score-sheet.csv', [['Roll number', 'Display name', 'Level 1 correct', 'Level 1 coins', 'Level 2 correct', 'Level 2 coins', 'Final judge', 'Clarity', 'Reasoning', 'Judgement', 'Communication', 'Verified by'],
  ...Array.from({ length: 150 }, () => Array(12).fill(''))]);
writeFileSync(path.join(outDir, 'final-case-and-rubric.txt'), `MARIO CAREER QUEST — FINAL CASE\n\nOffer A: ₹45,000/month at an early-stage startup with unclear responsibilities and no dedicated mentor.\nOffer B: ₹18,000/month at an established engineering organisation with structured mentoring and production code ownership.\n\nWhich would you choose, what trade-off do you accept, and what two things would you verify before signing? There is no mandatory choice; score the reasoning.\n\nEach judge scores Clarity and structure, Reasoning and trade-offs, Practical judgement, and Communication from 0 to 5. Average each finalist's judge totals out of 20. Tied podium finalists receive this same follow-up question: What single piece of new evidence would change your choice between these internships, and why? Score clarity and reasoning separately.\n`);
console.log(`Fallback files written to ${path.resolve(outDir)}. Keep the answer key with event staff only.`);
