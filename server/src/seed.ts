import { level1QuestionBank } from './level1QuestionBank.js';
import { level2QuestionBank } from './level2QuestionBank.js';
import { dbManager } from './db.js';

export function seedQuestions() {
  const db = (dbManager as any).db;
  const answerCount = db.prepare('SELECT COUNT(*) AS count FROM player_answers').get().count;
  const pipeAnswerCount = db.prepare('SELECT COUNT(*) AS count FROM pipe_quest_answers').get().count;
  const playedCount = db.prepare('SELECT COUNT(*) AS count FROM opened_questions').get().count;
  if (answerCount > 0 || pipeAnswerCount > 0 || playedCount > 0) throw new Error('Refusing to reseed: this database contains played questions or answers. Use a fresh DATA_DIR for a new event.');

  const questions = [
    // Level 1: the complete supplied question bank (15 questions).
    ...level1QuestionBank,

    // Level 2: the complete attached question bank (10 MCQs and 15 Myth/Fact items).

    ...level2QuestionBank,

    // =========================================================================
    // SUDDEN-DEATH QUESTIONS (For Cut-Off Ties)
    // =========================================================================
    {
      level: 1,
      category: 'SUDDEN_DEATH',
      prompt: 'SUDDEN DEATH: What is the primary difference between Git and GitHub?',
      option_a: 'Git is a cloud hosting service; GitHub is a command-line tool',
      option_b: 'Git is a local distributed version control tool; GitHub is a cloud-based hosting platform for Git repositories',
      option_c: 'They are two identical products created by the same company',
      option_d: 'Git is used only for Python, while GitHub is for JavaScript',
      correct_option: 'B',
      explanation: 'Git tracks code history locally; GitHub provides remote cloud collaboration, issue tracking, and CI/CD.',
      points: 100,
      time_limit_sec: 15,
      sort_order: 99
    },
    {
      level: 2,
      category: 'SUDDEN_DEATH',
      prompt: 'SUDDEN DEATH: A candidate claims 5 years of React experience on their resume while currently in their 2nd year of college. How do recruiters view this?',
      option_a: 'As impressive dedication since high school',
      option_b: 'As an obvious resume inflation red flag that damages candidate credibility',
      option_c: 'As proof of senior engineering mastery',
      option_d: 'It does not matter as long as they know hooks',
      correct_option: 'B',
      explanation: 'Exaggerating timelines or claiming senior years of commercial experience in early undergrad triggers immediate skepticism.',
      points: 100,
      time_limit_sec: 15,
      sort_order: 100
    }
  ];

  questions.unshift({
    level: 1, category: 'PRACTICE', is_practice: 1,
    prompt: 'Practice: Which button locks in your answer?',
    option_a: 'Tap one answer option', option_b: 'Refresh the page',
    option_c: 'Close your browser', option_d: 'Ask a friend to answer',
    correct_option: 'A', explanation: 'Tap one option. Practice earns no points.',
    points: 0, time_limit_sec: 20, sort_order: -1
  } as any);
  questions.push(
    { level: 1, category: 'SUDDEN_DEATH', prompt: 'Which resume bullet most clearly shows your contribution?',
      option_a: 'Worked on a website', option_b: 'Built a login page and tested it with 20 users',
      option_c: 'Good at coding', option_d: 'Team player', correct_option: 'B',
      explanation: 'Specific actions and outcomes make a contribution clear.', points: 0, time_limit_sec: 15, sort_order: 101 },
    { level: 2, category: 'SUDDEN_DEATH', prompt: 'A recruiter requests your banking PIN to confirm an interview. What should you do?',
      option_a: 'Share it after checking the logo', option_b: 'Share it only by phone',
      option_c: 'Refuse and verify through official channels', option_d: 'Ask a friend to pay instead', correct_option: 'C',
      explanation: 'Never share banking credentials with recruiters.', points: 0, time_limit_sec: 15, sort_order: 102 },
    { level: 1, category: 'SUDDEN_DEATH', prompt: 'What does PPO stand for in an internship context?',
      option_a: 'Pre-Placement Offer', option_b: 'Professional Project Outline',
      option_c: 'Post-Payment Order', option_d: 'Placement Program Option', correct_option: 'A',
      explanation: 'PPO means Pre-Placement Offer.', points: 0, time_limit_sec: 15, sort_order: 103 },
    { level: 2, category: 'SUDDEN_DEATH', prompt: 'An internship offer asks for a registration fee before the interview. Which check comes first?',
      option_a: 'Pay quickly to reserve a slot', option_b: 'Send an OTP as proof of identity',
      option_c: 'Verify the company and role through its official contact details', option_d: 'Forward the fee request to classmates', correct_option: 'C',
      explanation: 'Verify hiring claims independently before sharing money or sensitive details.', points: 0, time_limit_sec: 15, sort_order: 104 },
    { level: 1, category: 'SUDDEN_DEATH', prompt: 'Which detail makes a project description easier to assess?',
      option_a: 'The number of emojis in the README', option_b: 'Your role, the problem, and a measurable result',
      option_c: 'A list of every language you have heard of', option_d: 'A copied product slogan', correct_option: 'B',
      explanation: 'Specific work and outcomes help a reviewer understand your contribution.', points: 0, time_limit_sec: 15, sort_order: 105 },
    { level: 2, category: 'SUDDEN_DEATH', prompt: 'A recruiter sends an offer from a personal email address. What is the safest next step?',
      option_a: 'Assume it is genuine because it mentions the company', option_b: 'Post your Aadhaar card in the reply',
      option_c: 'Verify the offer with the company using an independently found official channel', option_d: 'Accept immediately', correct_option: 'C',
      explanation: 'Independent verification helps catch impersonation and forged offers.', points: 0, time_limit_sec: 15, sort_order: 106 },
    { level: 1, category: 'SUDDEN_DEATH', prompt: 'Which interview answer best handles a question you cannot solve immediately?',
      option_a: 'Explain your assumptions and test an approach aloud', option_b: 'Invent a result',
      option_c: 'Stay silent until time expires', option_d: 'Copy an answer from another tab', correct_option: 'A',
      explanation: 'Clear reasoning and honest assumptions show how you solve problems.', points: 0, time_limit_sec: 15, sort_order: 107 },
    { level: 2, category: 'SUDDEN_DEATH', prompt: 'What should you compare when choosing between two internships?',
      option_a: 'Only the advertised stipend', option_b: 'Learning, supervision, work, compensation, and written terms',
      option_c: 'Only the company logo', option_d: 'Only the shortest commute', correct_option: 'B',
      explanation: 'A sound decision weighs the work and mentorship alongside compensation.', points: 0, time_limit_sec: 15, sort_order: 108 }
  );

  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('DELETE FROM questions; DELETE FROM sqlite_sequence WHERE name = \'questions\';');

  const stmt = db.prepare(`
    INSERT INTO questions (level, category, prompt, option_a, option_b, option_c, option_d, correct_option, explanation, points, time_limit_sec, sort_order, is_practice, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of questions) {
    stmt.run(
      q.level,
      q.category,
      q.prompt,
      q.option_a,
      q.option_b,
      q.option_c || null,
      q.option_d || null,
      q.correct_option,
      q.explanation || null,
      q.points,
      q.time_limit_sec,
      q.sort_order,
      (q as any).is_practice || 0,
      'image_url' in q ? q.image_url || null : null
    );
  }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  console.log(`[Seed] Seeded ${questions.length} Mario Career Quest questions successfully!`);
}

seedQuestions();

