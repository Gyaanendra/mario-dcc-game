import { level2QuestionBank } from './level2QuestionBank.js';
import { dbManager } from './db.js';

export function seedQuestions() {
  const db = (dbManager as any).db;
  const answerCount = db.prepare('SELECT COUNT(*) AS count FROM player_answers').get().count;
  const pipeAnswerCount = db.prepare('SELECT COUNT(*) AS count FROM pipe_quest_answers').get().count;
  const playedCount = db.prepare('SELECT COUNT(*) AS count FROM opened_questions').get().count;
  if (answerCount > 0 || pipeAnswerCount > 0 || playedCount > 0) throw new Error('Refusing to reseed: this database contains played questions or answers. Use a fresh DATA_DIR for a new event.');

  const questions = [
    // =========================================================================
    // LEVEL 1: START YOUR QUEST — CAREER & PLACEMENT QUIZ (15 Questions)
    // =========================================================================
    {
      level: 1,
      category: 'PLACEMENT_TERMS',
      prompt: 'What does "PPO" stand for in an internship and placement context?',
      option_a: 'Pre-Placement Offer',
      option_b: 'Post-Probation Opportunity',
      option_c: 'Professional Placement Order',
      option_d: 'Priority Promotion Option',
      correct_option: 'A',
      explanation: 'A Pre-Placement Offer (PPO) is extended to interns who perform exceptionally well during their internship, converting it to a full-time job before campus placements.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 1
    },
    {
      level: 1,
      category: 'CAREER_BASICS',
      prompt: 'What is the primary objective of an internship for early-year B.Tech students?',
      option_a: 'Maximizing immediate income',
      option_b: 'Practical industry exposure, skill application, and learning workflow',
      option_c: 'Replacing academic credits entirely',
      option_d: 'Securing a senior managerial title',
      correct_option: 'B',
      explanation: 'Internships bridge academic concepts and real-world engineering practices, teamwork, and code ownership.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 2
    },
    {
      level: 1,
      category: 'RESUME',
      prompt: 'Which of the following bullet points on a software engineering resume is the strongest?',
      option_a: 'Worked on a web development project using React.',
      option_b: 'Built an e-commerce task tracker using React & Node.js, reducing query latency by 35% for 500+ items.',
      option_c: 'Responsible for coding and fixing bugs in the frontend.',
      option_d: 'Did frontend coding as part of my college coursework.',
      correct_option: 'B',
      explanation: 'Bullet B uses the STAR method (Action + Tech Stack + Quantifiable Impact), showing exactly what was built and its measurable outcome.',
      points: 100,
      time_limit_sec: 30,
      sort_order: 3
    },
    {
      level: 1,
      category: 'MYTH OR FACT?',
      prompt: 'Claim: "Having a 9.5+ CGPA guarantees you a top-tier tech placement." True or False?',
      option_a: 'True — CGPA is the sole deciding metric for all recruiters',
      option_b: 'False — CGPA clears initial eligibility, but offers depend on problem-solving, projects, and communication',
      option_c: 'True — Recruiters do not evaluate technical rounds if CGPA is above 9.0',
      option_d: 'False — CGPA is never checked by any tech company',
      correct_option: 'B',
      explanation: 'CGPA is an important eligibility filter, but technical interviews, projects, fundamentals, and behavioural skills determine the offer.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 4
    },
    {
      level: 1,
      category: 'CAREER_BASICS',
      prompt: 'When asked a technical question you don\'t know in an interview, what is the best strategy?',
      option_a: 'Pretend you know and invent arbitrary terminology',
      option_b: 'Stay completely silent until the interviewer changes the topic',
      option_c: 'Be honest, explain what related concepts you know, and walk through how you would logically investigate it',
      option_d: 'Argue that the question is irrelevant for early-year students',
      correct_option: 'C',
      explanation: 'Interviewers value intellectual honesty, problem-solving reasoning, and receptiveness to hints over guessing.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 5
    },
    {
      level: 1,
      category: 'PLACEMENT_TERMS',
      prompt: 'What does "CTC" represent in a placement job offer, and how does it differ from in-hand salary?',
      option_a: 'CTC equals your exact monthly take-home bank transfer',
      option_b: 'Cost to Company; it includes base pay, bonuses, PF, benefits, and stock options over vesting periods',
      option_c: 'Corporate Tax Contribution deducted by government',
      option_d: 'Certified Technical Certificate issued on joining',
      correct_option: 'B',
      explanation: 'CTC is the total annual cost the employer incurs for an employee, not the monthly take-home salary.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 6
    },
    {
      level: 1,
      category: 'RESUME',
      prompt: 'What does "ATS" stand for in modern recruitment pipelines?',
      option_a: 'Automated Technical Screener',
      option_b: 'Applicant Tracking System',
      option_c: 'Advanced Talent Sorter',
      option_d: 'Algorithm for Talent Selection',
      correct_option: 'B',
      explanation: 'Applicant Tracking Systems parse and index resume text before human recruiters review them. Formatting clarity is critical.',
      points: 100,
      time_limit_sec: 20,
      sort_order: 7
    },
    {
      level: 1,
      category: 'CAREER_BASICS',
      prompt: 'What makes a student\'s GitHub profile genuinely valuable to recruiters?',
      option_a: 'Forking 50 repositories without any personal commits',
      option_b: 'Pinning original projects with clear READMEs, architecture notes, and commit history',
      option_c: 'Only green commit squares made by automated scheduled bots',
      option_d: 'Uploading zipped textbook assignment solutions',
      correct_option: 'B',
      explanation: 'Recruiters and engineers look for code hygiene, original project architecture, documentation, and real problem-solving commits.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 8
    },
    {
      level: 1,
      category: 'PLACEMENT_TERMS',
      prompt: 'What does the "STAR" method stand for when answering behavioral interview questions?',
      option_a: 'Skill, Talent, Attitude, Result',
      option_b: 'Situation, Task, Action, Result',
      option_c: 'Strategy, Target, Approach, Review',
      option_d: 'Software, Testing, Architecture, Release',
      correct_option: 'B',
      explanation: 'STAR (Situation, Task, Action, Result) is the gold standard framework for answering behavioral and situational interview questions.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 9
    },
    {
      level: 1,
      category: 'CAREER_BASICS',
      prompt: 'When reaching out to alumni or industry engineers on LinkedIn for advice, which approach is most effective?',
      option_a: 'Send a connection request with just "Please refer me"',
      option_b: 'Send your resume directly without introducing yourself or knowing what their team does',
      option_c: 'Write a concise, tailored note mentioning their work, your background, and asking 1-2 focused questions',
      option_d: 'Message all employees of the company simultaneously with identical text',
      correct_option: 'C',
      explanation: 'Specific, polite, and research-backed messages build genuine professional relationships rather than being dismissed as spam.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 10
    },
    {
      level: 1,
      category: 'RESUME',
      prompt: 'For a 1st or 2nd-year B.Tech undergraduate student, what is the ideal resume length?',
      option_a: '1 page, crisp and high-density',
      option_b: '3 pages, listing every school workshop and hobby',
      option_c: '4-5 pages, including high school sports certificates',
      option_d: 'Resume length does not matter at all',
      correct_option: 'A',
      explanation: 'Undergraduate engineering resumes should almost universally be a well-structured, single page.',
      points: 100,
      time_limit_sec: 20,
      sort_order: 11
    },
    {
      level: 1,
      category: 'CAREER_BASICS',
      prompt: 'What is the role of Data Structures & Algorithms (DSA) vs Core Projects in software placements?',
      option_a: 'Only DSA matters; projects are never inspected',
      option_b: 'DSA demonstrates problem solving & time/space analysis; projects prove practical software engineering & design',
      option_c: 'Only web frameworks matter; algorithms are obsolete',
      option_d: 'Companies only test grammar and aptitude',
      correct_option: 'B',
      explanation: 'Top tech hiring evaluates DSA for foundational algorithmic competence and projects for real-world software craft.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 12
    },
    {
      level: 1,
      category: 'PLACEMENT_TERMS',
      prompt: 'What is an "NDA" (Non-Disclosure Agreement) in professional internships?',
      option_a: 'A contract defining your daily work hours',
      option_b: 'A legal agreement binding you to protect company confidential information and intellectual property',
      option_c: 'A certificate guaranteeing full-time hiring',
      option_d: 'A document required to join college clubs',
      correct_option: 'B',
      explanation: 'NDAs protect sensitive internal company codebases, customer data, and proprietary systems.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 13
    },
    {
      level: 1,
      category: 'RESUME',
      prompt: 'Which of the following belongs in the Technical Skills section of a developer resume?',
      option_a: '"Hardworking, punctual, and good listener"',
      option_b: '"Python, TypeScript, React, PostgreSQL, Docker, Git"',
      option_c: '"Can work under extreme pressure without sleeping"',
      option_d: '"Expert in Microsoft Word and Google Chrome browsing"',
      correct_option: 'B',
      explanation: 'Technical skills should list verifiable programming languages, frameworks, databases, and developer tooling.',
      points: 100,
      time_limit_sec: 20,
      sort_order: 14
    },
    {
      level: 1,
      category: 'CAREER_BASICS',
      prompt: 'If you fail an on-campus coding round or internship interview, what is the best immediate next action?',
      option_a: 'Assume software engineering is not for you and stop practicing',
      option_b: 'Blame the platform compiler and stop applying',
      option_c: 'Review the questions, identify topic gaps (e.g. DP or DB indexing), and deliberately practice them',
      option_d: 'Complain publicly on social media',
      correct_option: 'C',
      explanation: 'Rejection is data: every interview exposes specific blind spots that can be mastered for the next opportunity.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 15
    },

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
    INSERT INTO questions (level, category, prompt, option_a, option_b, option_c, option_d, correct_option, explanation, points, time_limit_sec, sort_order, is_practice)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      (q as any).is_practice || 0
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

