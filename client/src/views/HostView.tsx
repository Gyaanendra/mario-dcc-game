import React, { useState, useEffect } from 'react';
import { useGameSocket } from '../utils/socket';
import {
  Play,
  Pause,
  Clock,
  Lock,
  Eye,
  Trophy,
  Award,
  RefreshCw,
  Users,
  Zap,
  Sliders,
  FastForward,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const HostView: React.FC = () => {
  const {
    gameState,
    answerStats,
    counts,
    leaderboard,
    finalists,
    lastError,
    send,
    remainingSeconds
  } = useGameSocket('HOST');

  const [pin, setPin] = useState(localStorage.getItem('mcq_host_pin') || 'DCC2026');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Judge scoring state
  const [selectedFinalistId, setSelectedFinalistId] = useState<string>('');
  const [judgeName, setJudgeName] = useState('Faculty Judge 1');
  const [clarity, setClarity] = useState(4);
  const [reasoning, setReasoning] = useState(4);
  const [judgement, setJudgement] = useState(4);
  const [communication, setCommunication] = useState(4);
  const [judgeRemarks, setJudgeRemarks] = useState('');

  // Fetch questions for active level
  useEffect(() => {
    const levelToFetch = gameState.current_level === 0 ? 1 : gameState.current_level;
    fetch(`/api/questions?level=${levelToFetch}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setQuestions(data);
          if (data.length > 0 && !selectedQuestionId) {
            setSelectedQuestionId(data[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, [gameState.current_level, selectedQuestionId]);

  // Sync selected finalist when finalists load
  useEffect(() => {
    if (finalists && finalists.length > 0 && !selectedFinalistId) {
      setSelectedFinalistId(finalists[0].id);
    }
  }, [finalists, selectedFinalistId]);

  const showToast = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mcq_host_pin', pin);
    send({ type: 'HOST_AUTH', pin });
    setIsAuthenticated(true);
    showToast('Authenticated as Host successfully!');
  };

  // ONE-CLICK START GAME: Starts Level 1 and immediately opens Question 1
  const handleStartGameNow = () => {
    send({ type: 'HOST_START_LEVEL', level: 1 });
    const firstQ = questions.find((q) => q.level === 1) || questions[0] || { id: 1 };
    setTimeout(() => {
      send({ type: 'HOST_OPEN_QUESTION', questionId: firstQ.id });
      setSelectedQuestionId(firstQ.id);
      showToast(`Game Started! Question #${firstQ.id} is now LIVE on projector & phones!`);
    }, 500);
  };

  // ONE-CLICK NEXT QUESTION
  const handleNextQuestion = () => {
    if (!questions.length) return;
    const currentId = gameState.active_question_id || selectedQuestionId || 0;
    const currentIndex = questions.findIndex((q) => q.id === currentId);
    const nextQ = questions[currentIndex + 1] || questions[0];
    if (nextQ) {
      setSelectedQuestionId(nextQ.id);
      send({ type: 'HOST_OPEN_QUESTION', questionId: nextQ.id });
      showToast(`Advanced to Question #${nextQ.id}!`);
    }
  };

  const handleStartLevel = (level: number) => {
    send({ type: 'HOST_START_LEVEL', level });
    // Also auto-open first question of that level
    const firstQOfLevel = questions.find((q) => q.level === level);
    if (firstQOfLevel) {
      setTimeout(() => {
        send({ type: 'HOST_OPEN_QUESTION', questionId: firstQOfLevel.id });
        setSelectedQuestionId(firstQOfLevel.id);
      }, 500);
    }
    showToast(`Started Level ${level}!`);
  };

  const handleOpenQuestion = (qId: number) => {
    send({ type: 'HOST_OPEN_QUESTION', questionId: qId });
    showToast(`Question #${qId} is now LIVE!`);
  };

  const handlePauseResume = () => {
    if (gameState.timer_paused) {
      send({ type: 'HOST_RESUME_TIMER' });
      showToast('Timer Resumed');
    } else {
      send({ type: 'HOST_PAUSE_TIMER' });
      showToast('Timer Paused');
    }
  };

  const handleExtend = () => {
    send({ type: 'HOST_EXTEND_TIMER', seconds: 10 });
    showToast('+10 Seconds Added to Timer');
  };

  const handleLock = () => {
    send({ type: 'HOST_LOCK_QUESTION' });
    showToast('Question Locked! No more answers accepted.');
  };

  const handleReveal = () => {
    send({ type: 'HOST_REVEAL_ANSWER' });
    showToast('Answer & Coin Burst Revealed on Projector!');
  };

  const handleShowLeaderboard = () => {
    send({ type: 'HOST_SHOW_LEADERBOARD' });
    showToast('Leaderboard displayed on Projector!');
  };

  const handleCutoffL2 = () => {
    if (window.confirm('Execute Level 1 Cut-off? This qualifies the Top 50 participants for Level 2.')) {
      send({ type: 'HOST_CUTOFF_L2' });
      showToast('Top 50 Cut-Off Executed!');
    }
  };

  const handleCutoffL3 = () => {
    if (window.confirm('Execute Level 2 Cut-off? This qualifies the Top 10 finalists for Bowser Boss Challenge.')) {
      send({ type: 'HOST_CUTOFF_L3' });
      showToast('Top 10 Finalists Cut-Off Executed!');
    }
  };

  const handleStartBowser = () => {
    send({ type: 'HOST_START_BOWSER_STAGE' });
    showToast('Bowser Boss Stage Activated on Projector!');
  };

  const handleSubmitJudgeScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinalistId) return;
    send({
      type: 'HOST_SUBMIT_JUDGE_SCORE',
      finalist_id: selectedFinalistId,
      judge_name: judgeName,
      clarity_score: clarity,
      reasoning_score: reasoning,
      judgement_score: judgement,
      communication_score: communication,
      remarks: judgeRemarks
    });
    showToast('Judge score saved! Podium updated.');
  };

  const handleFinishAndPodium = () => {
    if (window.confirm('Show Victory Podium on the stage projector?')) {
      send({ type: 'HOST_FINISH_AND_PODIUM' });
      showToast('Victory Podium & Confetti Revealed!');
    }
  };

  const handleResetGame = () => {
    if (window.confirm('RESET ENTIRE GAME? This deletes all current scores and answers.')) {
      send({ type: 'HOST_RESET_GAME' });
      showToast('Game has been reset to Lobby.');
    }
  };

  // Auth Form if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0E101D] text-white flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-[#171B30] p-8 rounded-3xl border-4 border-yellow-500 shadow-2xl max-w-sm w-full space-y-4">
          <div className="text-center">
            <h1 className="font-pixel text-lg text-yellow-400">HOST CONTROL ROOM</h1>
            <p className="text-xs font-mono text-zinc-400 mt-1">Dean Career Cloud • Bennett Univ</p>
          </div>
          <div>
            <label className="block text-xs font-pixel text-zinc-300 mb-2">ENTER ADMIN PIN</label>
            <input
              type="password"
              placeholder="e.g. DCC2026"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-[#0E101D] border-2 border-zinc-600 focus:border-yellow-400 rounded-lg p-3 text-sm font-mono text-center tracking-widest outline-none text-yellow-300"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-red-600 hover:bg-red-500 font-pixel text-xs rounded-xl border-2 border-black pixel-box"
          >
            LOGIN AS HOST
          </button>
        </form>
      </div>
    );
  }

  const totalAnswered = answerStats?.total || 0;
  const answeredPercent = counts.connected > 0 ? Math.round((totalAnswered / counts.connected) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0E101D] text-white p-6 font-sans">
      {/* Toast Notification Banner */}
      {statusMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white font-mono text-xs px-4 py-3 rounded-xl border-2 border-green-300 shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      {lastError && (
        <div className="fixed top-4 left-4 z-50 bg-red-600 text-white font-mono text-xs px-4 py-3 rounded-xl border-2 border-red-300 shadow-2xl flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{lastError}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-[#171B30] border-2 border-zinc-700 p-4 rounded-2xl flex items-center justify-between shadow-xl mb-6">
        <div>
          <div className="font-pixel text-xs text-red-500">DCC ADMIN CONSOLE</div>
          <h1 className="text-xl font-bold font-pixel text-yellow-400">MARIO CAREER QUEST</h1>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-6 text-sm font-mono">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-700">
            <Users size={16} className="text-green-400" />
            <span className="text-green-400 font-bold">{counts.connected}</span>
            <span className="text-zinc-400">/ {counts.total} Registered</span>
          </div>

          <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-700 font-pixel text-xs text-yellow-300">
            LEVEL: {gameState.current_level} • STATE: {gameState.game_status}
          </div>

          <button
            onClick={handleResetGame}
            className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-700 rounded text-xs font-mono text-red-300 flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            <span>Reset Room</span>
          </button>
        </div>
      </header>

      {/* Grid: Controls & Panels */}
      <div className="grid grid-cols-12 gap-6">
        {/* =========================================================================
            LEFT COLUMN: GAME LIFECYCLE & ACTIVE QUESTION CONTROLS (8 Cols)
            ========================================================================= */}
        <div className="col-span-8 space-y-6">
          {/* BIG ONE-CLICK ACTION BANNER: START GAME & NEXT QUESTION */}
          <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-green-950 p-5 rounded-2xl border-4 border-yellow-500 shadow-2xl flex items-center justify-between">
            <div>
              <div className="font-pixel text-xs text-yellow-400">ONE-CLICK HOST TRIGGER</div>
              <div className="text-sm text-zinc-300 font-mono mt-0.5">
                {gameState.game_status === 'LOBBY'
                  ? 'All players are in lobby. Click to start Quest with Question #1!'
                  : `Currently on Question #${gameState.active_question_id || 1}. Status: ${gameState.game_status}`}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {gameState.game_status === 'LOBBY' ? (
                <button
                  onClick={handleStartGameNow}
                  className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white font-pixel text-sm rounded-xl border-4 border-black pixel-box shadow-xl flex items-center gap-3 animate-pulse"
                >
                  <Play size={20} />
                  <span>START GAME NOW ▶</span>
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-pixel text-xs rounded-xl border-4 border-black pixel-box shadow-xl flex items-center gap-2"
                >
                  <FastForward size={18} />
                  <span>NEXT QUESTION ⏭</span>
                </button>
              )}
            </div>
          </div>

          {/* Level Switcher */}
          <div className="bg-[#171B30] border-2 border-zinc-700 p-5 rounded-2xl shadow-lg space-y-3">
            <div className="font-pixel text-xs text-yellow-400 flex items-center gap-2">
              <Zap size={16} />
              <span>ROUND LIFECYCLE SELECTOR</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => handleStartLevel(1)}
                className={`p-3 rounded-xl border-2 font-pixel text-xs transition-all ${
                  gameState.current_level === 1
                    ? 'bg-red-600 border-yellow-400 text-white scale-[1.02]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                LEVEL 1: QUIZ
              </button>
              <button
                onClick={() => handleStartLevel(2)}
                className={`p-3 rounded-xl border-2 font-pixel text-xs transition-all ${
                  gameState.current_level === 2
                    ? 'bg-blue-600 border-yellow-400 text-white scale-[1.02]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                LEVEL 2: BLOCKS
              </button>
              <button
                onClick={handleStartBowser}
                className={`p-3 rounded-xl border-2 font-pixel text-xs transition-all ${
                  gameState.current_level === 3
                    ? 'bg-purple-600 border-yellow-400 text-white scale-[1.02]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                LEVEL 3: BOWSER
              </button>
              <button
                onClick={handleFinishAndPodium}
                className="p-3 rounded-xl border-2 border-yellow-500 bg-yellow-500/20 hover:bg-yellow-500/30 font-pixel text-xs text-yellow-300"
              >
                🏆 PODIUM
              </button>
            </div>
          </div>

          {/* Active Question Controller */}
          <div className="bg-[#171B30] border-2 border-zinc-700 p-6 rounded-2xl shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="font-pixel text-xs text-yellow-400">QUESTION WORKFLOW CONTROLS</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-400">TIMER:</span>
                <span
                  className={`font-pixel text-lg px-3 py-0.5 rounded border ${
                    remainingSeconds <= 5
                      ? 'bg-red-600 border-red-400 text-white animate-pulse'
                      : 'bg-black border-yellow-400 text-yellow-300'
                  }`}
                >
                  {remainingSeconds}s
                </span>
              </div>
            </div>

            {/* Question Selector */}
            <div className="flex items-center gap-3">
              <select
                value={selectedQuestionId || ''}
                onChange={(e) => setSelectedQuestionId(Number(e.target.value))}
                className="flex-1 bg-zinc-900 border-2 border-zinc-600 rounded-xl p-3 text-sm font-sans outline-none focus:border-yellow-400 text-zinc-100"
              >
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    Q#{q.id} [{q.category}] {q.prompt.slice(0, 75)}...
                  </option>
                ))}
              </select>

              <button
                onClick={() => selectedQuestionId && handleOpenQuestion(selectedQuestionId)}
                className="px-5 py-3 bg-green-600 hover:bg-green-500 text-white font-pixel text-xs rounded-xl border-2 border-black pixel-box flex items-center gap-2 shrink-0"
              >
                <Play size={16} />
                <span>LAUNCH QUESTION</span>
              </button>
            </div>

            {/* Live Progress Meter */}
            <div className="bg-black/40 p-4 rounded-xl border border-zinc-700 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-300">
                  Submissions: <strong>{totalAnswered}</strong> / {counts.connected} Answered
                </span>
                <span className="text-yellow-400 font-bold">{answeredPercent}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${answeredPercent}%` }} />
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={handlePauseResume}
                className="py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl text-xs font-pixel text-zinc-200 flex items-center justify-center gap-1.5"
              >
                {gameState.timer_paused ? <Play size={16} /> : <Pause size={16} />}
                <span>{gameState.timer_paused ? 'RESUME' : 'PAUSE'}</span>
              </button>

              <button
                onClick={handleExtend}
                className="py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl text-xs font-pixel text-zinc-200 flex items-center justify-center gap-1.5"
              >
                <Clock size={16} />
                <span>+10 SEC</span>
              </button>

              <button
                onClick={handleLock}
                className="py-3 bg-amber-700 hover:bg-amber-600 border border-amber-500 rounded-xl text-xs font-pixel text-white flex items-center justify-center gap-1.5"
              >
                <Lock size={16} />
                <span>LOCK ANSWERS</span>
              </button>

              <button
                onClick={handleReveal}
                className="py-3 bg-blue-600 hover:bg-blue-500 border border-blue-400 rounded-xl text-xs font-pixel text-white flex items-center justify-center gap-1.5"
              >
                <Eye size={16} />
                <span>REVEAL & COINS</span>
              </button>
            </div>

            {/* Cut-off and Leaderboard buttons */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <button
                onClick={handleShowLeaderboard}
                className="py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl text-xs font-pixel text-yellow-300 flex items-center justify-center gap-1.5"
              >
                <Trophy size={16} />
                <span>LEADERBOARD</span>
              </button>

              <button
                onClick={handleCutoffL2}
                className="py-3 bg-purple-900 hover:bg-purple-800 border border-purple-500 rounded-xl text-xs font-pixel text-purple-200 flex items-center justify-center gap-1.5"
              >
                <Award size={16} />
                <span>TOP 50 CUT-OFF</span>
              </button>

              <button
                onClick={handleCutoffL3}
                className="py-3 bg-purple-900 hover:bg-purple-800 border border-purple-500 rounded-xl text-xs font-pixel text-purple-200 flex items-center justify-center gap-1.5"
              >
                <Award size={16} />
                <span>TOP 10 CUT-OFF</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: LEVEL 3 JUDGE RUBRIC & LEADERBOARD PREVIEW (4 Cols)
            ========================================================================= */}
        <div className="col-span-4 space-y-6">
          {/* Level 3 Judge Scoring Matrix */}
          <form onSubmit={handleSubmitJudgeScore} className="bg-[#171B30] border-2 border-purple-500/80 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="font-pixel text-xs text-purple-400 flex items-center gap-2">
              <Sliders size={16} />
              <span>LEVEL 3 JUDGE RUBRIC</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">SELECT FINALIST</label>
              <select
                value={selectedFinalistId}
                onChange={(e) => setSelectedFinalistId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono text-white outline-none"
              >
                {finalists.length === 0 && <option value="">No Top 10 Finalists Yet</option>}
                {finalists.map((f, i) => (
                  <option key={f.id} value={f.id}>
                    #{i + 1} {f.name} ({f.student_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">JUDGE NAME</label>
              <input
                type="text"
                value={judgeName}
                onChange={(e) => setJudgeName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono text-white outline-none"
              />
            </div>

            {/* Rubric Sliders: 0-5 Points */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-300">Clarity & Structure (5):</span>
                <span className="text-yellow-400 font-bold">{clarity}/5</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={clarity}
                onChange={(e) => setClarity(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />

              <div className="flex justify-between">
                <span className="text-zinc-300">Reasoning & Trade-offs (5):</span>
                <span className="text-yellow-400 font-bold">{reasoning}/5</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={reasoning}
                onChange={(e) => setReasoning(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />

              <div className="flex justify-between">
                <span className="text-zinc-300">Practical Judgement (5):</span>
                <span className="text-yellow-400 font-bold">{judgement}/5</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={judgement}
                onChange={(e) => setJudgement(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />

              <div className="flex justify-between">
                <span className="text-zinc-300">Communication & Time (5):</span>
                <span className="text-yellow-400 font-bold">{communication}/5</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={communication}
                onChange={(e) => setCommunication(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 mt-2">REMARKS (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="e.g. Strong rationale on mentorship"
                  value={judgeRemarks}
                  onChange={(e) => setJudgeRemarks(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-700/60 flex justify-between items-center">
              <span className="font-mono text-xs text-zinc-300">TOTAL SCORE:</span>
              <span className="font-pixel text-base text-yellow-300">
                {clarity + reasoning + judgement + communication} / 20
              </span>
            </div>

            <button
              type="submit"
              disabled={!selectedFinalistId}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 font-pixel text-xs rounded-xl border border-black pixel-box disabled:opacity-50"
            >
              SAVE RUBRIC SCORE
            </button>
          </form>

          {/* Live Top Standings Preview */}
          <div className="bg-[#171B30] border-2 border-zinc-700 p-4 rounded-2xl shadow-lg space-y-3">
            <div className="font-pixel text-xs text-yellow-400">CURRENT LEADERBOARD</div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
              {leaderboard.slice(0, 10).map((p, i) => (
                <div key={p.id} className="flex justify-between p-1.5 bg-black/40 rounded border border-zinc-800">
                  <span className="truncate max-w-[140px]">
                    #{i + 1} {p.name}
                  </span>
                  <span className="text-yellow-400 font-bold">{p.total_coins} coins</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
