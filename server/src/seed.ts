import { dbManager } from './db.js';

export function seedQuestions() {
  const db = (dbManager as any).db;
  const answerCount = db.prepare('SELECT COUNT(*) AS count FROM player_answers').get().count;
  const playedCount = db.prepare('SELECT COUNT(*) AS count FROM opened_questions').get().count;
  if (answerCount > 0 || playedCount > 0) throw new Error('Refusing to reseed: this database contains played questions or answers. Use a fresh DATA_DIR for a new event.');

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

    // =========================================================================
    // LEVEL 2: QUESTION BLOCK — MYTH-BUSTING & RED FLAGS (20 Questions)
    // Categories: 'MYTH OR FACT?', 'CHOOSE WISELY', 'RED FLAG'
    // =========================================================================
    {
      level: 2,
      category: 'RED FLAG',
      prompt: 'A message on WhatsApp offers an "Exclusive Machine Learning Internship with ₹40,000 Stipend", but asks for a ₹750 "Document Processing & Badge Fee" first. What should you do?',
      option_a: 'Pay immediately before the deadline expires',
      option_b: 'Send your Aadhaar card and bank account details',
      option_c: 'STOP! Genuine employers NEVER charge candidates an application or onboarding fee. Report and verify.',
      option_d: 'Forward the message to batchmates to share the opportunity',
      correct_option: 'C',
      explanation: 'Requiring fees for job offers, training certificates, or security deposits is the #1 hallmark of recruitment fraud.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 1
    },
    {
      level: 2,
      category: 'MYTH OR FACT?',
      prompt: 'Myth or Fact: "Getting an employee referral guarantees you will receive an interview shortlist or offer letter."',
      option_a: 'FACT — Referrals bypass all technical screening rounds automatically',
      option_b: 'MYTH — A referral may help a profile get noticed, but it guarantees neither an interview nor an offer',
      option_c: 'FACT — Companies are legally obligated to hire referred candidates',
      option_d: 'MYTH — Referrals decrease your chances because recruiters scrutinize you more harshly',
      correct_option: 'B',
      explanation: 'Referral processes vary by employer. A referral does not replace the stated selection criteria.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 2
    },
    {
      level: 2,
      category: 'CHOOSE WISELY',
      prompt: 'You want evidence of your software skills for an internship application in six weeks. Which plan gives the clearest evidence?',
      option_a: 'Watch 10 different tutorial playlists in 5 languages without writing any independent code',
      option_b: 'Build one robust, deployed full-stack project with documentation, unit tests, and real user authentication',
      option_c: 'Memorize answers to 200 interview trivia questions without coding',
      option_d: 'Add every trending buzzword (Web3, AI, Cloud, Quantum) to your resume without projects',
      correct_option: 'B',
      explanation: 'A finished project with clear documentation gives an interviewer specific work to discuss. Different goals may call for a different plan.',
      points: 100,
      time_limit_sec: 30,
      sort_order: 3
    },
    {
      level: 2,
      category: 'RED FLAG',
      prompt: 'You receive an internship offer letter from an HR manager using the email "careers-microsoft@gmail.com" instead of an official domain. Is this normal?',
      option_a: 'Yes — Corporate HRs commonly use free personal Gmail accounts for privacy',
      option_b: 'Warning sign — verify the sender and offer through the company’s official website or known contact',
      option_c: 'Yes — As long as the company logo is attached in the PDF header',
      option_d: 'Normal only for early-year undergraduate internships',
      correct_option: 'B',
      explanation: 'A company name in an email address or PDF does not prove authenticity. Contact the employer using independently verified details.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 4
    },
    {
      level: 2,
      category: 'MYTH OR FACT?',
      prompt: 'Myth or Fact: "Open Source contributions only count if you are contributing to massive projects like Linux or React."',
      option_a: 'FACT — Small open-source contributions are ignored by engineering hiring managers',
      option_b: 'MYTH — Improving documentation, fixing bugs, or adding test cases to any active community repo proves collaboration & Git skills',
      option_c: 'FACT — Only paid open-source programs like GSoC carry any resume weight',
      option_d: 'MYTH — Open source contributions are considered a negative signal by traditional firms',
      correct_option: 'B',
      explanation: 'Active public PRs demonstrate real-world code reviews, Git proficiency, and the ability to read existing codebases.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 5
    },
    {
      level: 2,
      category: 'CHOOSE WISELY',
      prompt: 'Offer A pays ₹30,000 for data-entry work. Offer B pays ₹12,000 for mentored backend work. Before choosing, what should a CS student compare?',
      option_a: 'Always Offer A — Stipend amount is the only metric that matters',
      option_b: 'Financial needs, actual duties, mentorship, written terms, and personal career goals',
      option_c: 'Reject both and wait for a FAANG remote internship',
      option_d: 'Accept Offer A and pay someone else to do the spreadsheet work',
      correct_option: 'B',
      explanation: 'Either offer can be reasonable in context. A strong decision considers both financial needs and the quality of the role.',
      points: 100,
      time_limit_sec: 30,
      sort_order: 6
    },
    {
      level: 2,
      category: 'RED FLAG',
      prompt: 'An internship agreement contains a clause stating: "Candidate must pay a penalty of ₹50,000 if they leave before 12 months, and no stipend is paid during the first 3 months." What does this represent?',
      option_a: 'Standard industry policy for software interns',
      option_b: 'Concerning terms — seek written clarification and university or legal advice before signing',
      option_c: 'A sign of high commitment demanded by elite startups',
      option_d: 'A legal requirement enforced by placement committees',
      correct_option: 'B',
      explanation: 'Understand the full terms and consequences before signing. The clause needs careful independent review.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 7
    },
    {
      level: 2,
      category: 'MYTH OR FACT?',
      prompt: 'Myth or Fact: "You must master all popular tech stacks (MERN, Django, Spring Boot, Flutter, Go, Rust) before applying for 2nd-year internships."',
      option_a: 'FACT — Tech companies expect second-year students to be full-stack polyglots in 6+ ecosystems',
      option_b: 'MYTH — Companies value solid CS fundamentals (OOP, OS, DBMS, Networks) and deep proficiency in ONE language/stack over superficial breadth',
      option_c: 'FACT — Recruiters test candidates in at least 4 backend frameworks during round 1',
      option_d: 'MYTH — Tech stacks are never tested in technical interviews',
      correct_option: 'B',
      explanation: 'Depth in one language with strong CS principles is far easier to convert into new frameworks than surface-level knowledge of six.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 8
    },
    {
      level: 2,
      category: 'RED FLAG',
      prompt: 'During an online interview, the interviewer refuses to turn on their camera, cannot specify what product you will work on, and insists that you sign over your personal bank OTP for "salary account activation". What is this?',
      option_a: 'A confidentiality protocol of stealth startups',
      option_b: 'A direct financial phishing attack. Disconnect immediately.',
      option_c: 'Standard verification for international remote internships',
      option_d: 'A harmless HR procedure',
      correct_option: 'B',
      explanation: 'Never share personal banking OTPs, UPI PINs, or credentials with any recruiter or employer under any circumstance.',
      points: 100,
      time_limit_sec: 20,
      sort_order: 9
    },
    {
      level: 2,
      category: 'CHOOSE WISELY',
      prompt: 'A role uses coding assessments and project interviews. Which preparation plan covers both parts?',
      option_a: '100% DSA, 0% Projects',
      option_b: '0% DSA, 100% Projects',
      option_c: 'Plan for both DSA practice and the ability to explain and improve your own projects, adjusting time to the role',
      option_d: 'Spend all time preparing for HR questions',
      correct_option: 'C',
      explanation: 'The right time split depends on the role and your starting point; prepare for each stated assessment.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 10
    },
    {
      level: 2,
      category: 'MYTH OR FACT?',
      prompt: 'Myth or Fact: "Listing an unfinished or copied project from a YouTube tutorial is safe as long as the code works on your laptop."',
      option_a: 'FACT — Interviewers never ask in-depth questions about project implementation details',
      option_b: 'MYTH — Senior engineers routinely ask why specific architectural decisions, data models, or error-handling trade-offs were chosen',
      option_c: 'FACT — Tutorial projects are given preference over unique ideas',
      option_d: 'MYTH — It is illegal to list personal code on resumes',
      correct_option: 'B',
      explanation: 'Cloned tutorial projects without genuine understanding fall apart in minutes when interviewers ask "Why did you choose this architecture over alternatives?".',
      points: 100,
      time_limit_sec: 25,
      sort_order: 11
    },
    {
      level: 2,
      category: 'RED FLAG',
      prompt: 'An internship asks you to build a complete app alone for equity only, with no written mentoring plan. What should you check before accepting?',
      option_a: 'A prestigious founding engineer opportunity',
      option_b: 'Get the workload, supervision, ownership, compensation, and equity terms in writing; seek advice before committing',
      option_c: 'A government-approved startup internship schema',
      option_d: 'The fastest path to becoming a CTO',
      correct_option: 'B',
      explanation: 'Vague equity and duties create risk. Clear written terms help you judge whether the opportunity fits your needs.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 12
    },
    {
      level: 2,
      category: 'CHOOSE WISELY',
      prompt: 'You encounter a bug during a hackathon or live coding challenge that you cannot fix after 15 minutes. What is the smartest move?',
      option_a: 'Delete the entire repo and restart from zero',
      option_b: 'Use structured debugging: check logs/stack trace, isolate inputs, test edge cases, and explain your thought process out loud',
      option_c: 'Pretend the bug does not exist and hope judges don\'t click that button',
      option_d: 'Give up immediately',
      correct_option: 'B',
      explanation: 'Systematic debugging and articulating your thought process clearly are key traits evaluated by tech leads.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 13
    },
    {
      level: 2,
      category: 'MYTH OR FACT?',
      prompt: 'Myth or Fact: "Companies only hire candidates who solve LeetCode Hard problems in under 10 minutes."',
      option_a: 'FACT — All entry-level college hiring assessments use LeetCode Hard as the minimum benchmark',
      option_b: 'MYTH — Most college hiring targets solid Medium-level algorithmic intuition, clear code readability, and edge-case handling',
      option_c: 'FACT — Even frontend UI roles require solving Hard dynamic programming problems',
      option_d: 'MYTH — DSA is never timed in any interview',
      correct_option: 'B',
      explanation: 'Mastering Easy to Medium DSA patterns with clean, idiomatic code and verbal explanations clears the vast majority of campus rounds.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 14
    },
    {
      level: 2,
      category: 'RED FLAG',
      prompt: 'You receive an unsolicited Telegram message congratulating you on being selected for a remote part-time job paying ₹3,000/day for "liking YouTube videos and rating Google Maps pins". What is this?',
      option_a: 'A legitimate social media marketing internship',
      option_b: 'A common task-scam pattern; verify independently and never send money to unlock earnings',
      option_c: 'A Google campus ambassador program',
      option_d: 'A fast way to earn college pocket money',
      correct_option: 'B',
      explanation: 'Task scams trick victims by giving small initial payouts before asking for deposits to unlock higher tiers, causing major financial losses.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 15
    },
    {
      level: 2,
      category: 'CHOOSE WISELY',
      prompt: 'An interviewer asks: "Do you have any questions for us at the end of the interview?" What is the most impactful response?',
      option_a: '"No, I have no questions. When do I get the offer?"',
      option_b: '"Ask thoughtful questions about engineering culture, deployment pipelines, or recent technical challenges faced by their team"',
      option_c: '"How many holidays does the company give every month?"',
      option_d: '"Can I work 100% from home while attending another college?"',
      correct_option: 'B',
      explanation: 'Asking insightful questions demonstrates genuine curiosity, professional maturity, and active interest in the role.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 16
    },
    {
      level: 2,
      category: 'MYTH OR FACT?',
      prompt: 'Myth or Fact: "You should never put hobbies or non-technical leadership roles (e.g. club organizer) on your resume."',
      option_a: 'FACT — Non-technical items instantly disqualify you from tech roles',
      option_b: 'MYTH — Concise leadership and club impact (e.g. organizing DCC events) demonstrate teamwork, initiative, and communication',
      option_c: 'FACT — Only university exam marks should be listed',
      option_d: 'MYTH — Resumes should be 80% hobbies and 20% technical',
      correct_option: 'B',
      explanation: 'Demonstrating leadership, club coordination, and ownership provides concrete proof of soft skills and organizational capability.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 17
    },
    {
      level: 2,
      category: 'RED FLAG',
      prompt: 'A company issues an internship offer but refuses to provide any written offer letter, contact email, or official physical address, communicating only via anonymous Discord.',
      option_a: 'Completely normal for Web3 and AI companies',
      option_b: 'Severe red flag — Always insist on formal written terms detailing roles, duration, compensation, and legal entity details',
      option_c: 'Legal as long as they verbally promised a certificate',
      option_d: 'Recommended because it protects candidate privacy',
      correct_option: 'B',
      explanation: 'Without a verifiable legal entity and written contract, students have zero recourse in cases of non-payment or credential fraud.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 18
    },
    {
      level: 2,
      category: 'CHOOSE WISELY',
      prompt: 'Which strategy best prepares an early-year student for competitive hackathons and coding contests?',
      option_a: 'Forming a balanced team with complementary skills (e.g., UI/UX, Backend/API, Pitch/Presentation) and doing mock hackathons',
      option_b: 'Joining alone and attempting to learn 4 new frameworks during the hackathon night',
      option_c: 'Submitting pre-built past projects without modifying anything',
      option_d: 'Only attending hackathons for free meals and stickers',
      correct_option: 'A',
      explanation: 'Cross-functional teamwork and clear role division are the decisive factors in winning hackathons.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 19
    },
    {
      level: 2,
      category: 'MYTH OR FACT?',
      prompt: 'Myth or Fact: "If you don\'t secure an internship in your 1st year of college, your tech career is permanently doomed."',
      option_a: 'FACT — 1st year internship is mandatory for all future campus placement eligibility',
      option_b: 'MYTH — 1st and 2nd years are best invested in foundational coding, core math/CS subjects, building portfolio projects, and exploring domains',
      option_c: 'FACT — Major tech companies only hire students who interned in semester 2',
      option_d: 'MYTH — Internships are only available after graduation',
      correct_option: 'B',
      explanation: 'Most top corporate internships recruit during 3rd year (5th/6th sem). 1st/2nd years are designed for fundamentals, exploration, and hackathons.',
      points: 100,
      time_limit_sec: 25,
      sort_order: 20
    },

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
    correct_option: 'A', explanation: 'Tap one option. Practice earns no coins.',
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

