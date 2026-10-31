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
  FastForward,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  MessageSquare
} from 'lucide-react';

type HostTab = 'controls' | 'participants' | 'answers';

export const HostView: React.FC = () => {
  const {
    gameState,
    answerStats,
    counts,
    leaderboard,
    finalists,
    lastError,
    send,
    remainingSeconds,
    pillarAnswers,
    hostPlayers
  } = useGameSocket('HOST');

  const [pin, setPin] = useState(localStorage.getItem('mcq_host_pin') || 'DCC2026');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HostTab>('controls');

  const [selectedFinalistId, setSelectedFinalistId] = useState<string>('');
  const [judgeName, setJudgeName] = useState('Faculty Judge 1');
  const [clarity, setClarity] = useState(4);
  const [reasoning, setReasoning] = useState(4);
  const [judgement, setJudgement] = useState(4);
  const [communication, setCommunication] = useState(4);
  const [judgeRemarks, setJudgeRemarks] = useState('');

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

  const handleStartGameNow = () => {
    send({ type: 'HOST_START_LEVEL', level: 1 });
    const firstQ = questions.find((q) => q.level === 1) || questions[0] || { id: 1 };
    setTimeout(() => {
      send({ type: 'HOST_OPEN_QUESTION', questionId: firstQ.id });
      setSelectedQuestionId(firstQ.id);
      showToast(`Game Started! Question #${firstQ.id} is now LIVE!`);
    }, 500);
  };

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
    showToast('+10 Seconds Added');
  };

  const handleLock = () => {
    send({ type: 'HOST_LOCK_QUESTION' });
    showToast('Question Locked!');
  };

  const handleReveal = () => {
    send({ type: 'HOST_REVEAL_ANSWER' });
    showToast('Answer Revealed!');
  };

  const handleShowLeaderboard = () => {
    send({ type: 'HOST_SHOW_LEADERBOARD' });
    showToast('Leaderboard displayed!');
  };

  const handleCutoffL2 = () => {
    if (window.confirm('Execute Level 1 Cut-off? Top 50 qualify for Level 2.')) {
      send({ type: 'HOST_CUTOFF_L2' });
      showToast('Top 50 Cut-Off Executed!');
    }
  };

  const handleCutoffL3 = () => {
    if (window.confirm('Execute Level 2 Cut-off? Top 10 qualify for Bowser.')) {
      send({ type: 'HOST_CUTOFF_L3' });
      showToast('Top 10 Cut-Off Executed!');
    }
  };

  const handleStartBowser = () => {
    send({ type: 'HOST_START_BOWSER_STAGE' });
    showToast('Bowser Stage Activated!');
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
    showToast('Judge score saved!');
  };

  const handleFinishAndPodium = () => {
    if (window.confirm('Show Victory Podium?')) {
      send({ type: 'HOST_FINISH_AND_PODIUM' });
      showToast('Victory Podium Revealed!');
    }
  };

  const handleResetGame = () => {
    if (window.confirm('RESET ENTIRE GAME? This deletes all scores and answers.')) {
      send({ type: 'HOST_RESET_GAME' });
      showToast('Game has been reset.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0E101D] text-white flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-[#171B30] p-8 rounded-3xl border-4 border-yellow-500 shadow-2xl max-w-sm w-full space-y-4">
          <div className="text-center">
            <h1 className="font-pixel text-lg text-yellow-400">HOST CONTROL ROOM</h1>
            <p className="text-xs font-mono text-zinc-400 mt-1">Dean Career Cloud</p>
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
          <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 font-pixel text-xs rounded-xl border-2 border-black">
            LOGIN AS HOST
          </button>
        </form>
      </div>
    );
  }

  const totalAnswered = answerStats?.total || 0;
  const answeredPercent = counts.connected > 0 ? Math.round((totalAnswered / counts.connected) * 100) : 0;

  const tabItems: { key: HostTab; label: string; icon: React.ReactNode }[] = [
    { key: 'controls', label: 'GAME CONTROLS', icon: <Zap size={16} /> },
    { key: 'participants', label: 'PARTICIPANTS', icon: <Users size={16} /> },
    { key: 'answers', label: 'PILLAR ANSWERS', icon: <MessageSquare size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0E101D] text-white p-6 font-sans">
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

      {/* Header with tabs */}
      <header className="bg-[#171B30] border-2 border-zinc-700 p-4 rounded-2xl flex items-center justify-between shadow-xl mb-6">
        <div>
          <div className="font-pixel text-xs text-red-500">DCC ADMIN CONSOLE</div>
          <h1 className="text-xl font-bold font-pixel text-yellow-400">MARIO CAREER QUEST</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-zinc-700">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-pixel transition-all ${
                  activeTab === tab.key
                    ? 'bg-yellow-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Live Counters */}
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-700">
            <Users size={16} className="text-green-400" />
            <span className="text-green-400 font-bold text-sm">{counts.connected}</span>
            <span className="text-zinc-400 text-xs">/ {counts.total}</span>
          </div>

          <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-700 font-pixel text-xs text-yellow-300">
            L{gameState.current_level} • {gameState.game_status}
          </div>

          <button
            onClick={handleResetGame}
            className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-700 rounded text-xs font-mono text-red-300 flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Tab: Game Controls */}
      {activeTab === 'controls' && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 space-y-6">
            {/* One-Click Action Banner */}
            <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-green-950 p-5 rounded-2xl border-4 border-yellow-500 shadow-2xl flex items-center justify-between">
              <div>
                <div className="font-pixel text-xs text-yellow-400">ONE-CLICK HOST TRIGGER</div>
                <div className="text-sm text-zinc-300 font-mono mt-0.5">
                  {gameState.game_status === 'LOBBY'
                    ? 'All players in lobby. Click to start!'
                    : `Question #${gameState.active_question_id || 1} • ${gameState.game_status}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {gameState.game_status === 'LOBBY' ? (
                  <button onClick={handleStartGameNow} className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white font-pixel text-sm rounded-xl border-4 border-black shadow-xl flex items-center gap-3 animate-pulse">
                    <Play size={20} />
                    <span>START GAME NOW</span>
                  </button>
                ) : (
                  <button onClick={handleNextQuestion} className="px-6 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-pixel text-xs rounded-xl border-4 border-black shadow-xl flex items-center gap-2">
                    <FastForward size={18} />
                    <span>NEXT QUESTION</span>
                  </button>
                )}
              </div>
            </div>

            {/* Level Switcher */}
            <div className="bg-[#171B30] border-2 border-zinc-700 p-5 rounded-2xl shadow-lg space-y-3">
              <div className="font-pixel text-xs text-yellow-400 flex items-center gap-2">
                <Zap size={16} />
                <span>ROUND LIFECYCLE</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2].map((level) => (
                  <button key={level} onClick={() => handleStartLevel(level)}
                    className={`p-3 rounded-xl border-2 font-pixel text-xs transition-all ${
                      gameState.current_level === level
                        ? level === 1 ? 'bg-red-600 border-yellow-400 text-white' : 'bg-blue-600 border-yellow-400 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    LEVEL {level}
                  </button>
                ))}
                <button onClick={handleStartBowser}
                  className={`p-3 rounded-xl border-2 font-pixel text-xs transition-all ${
                    gameState.current_level === 3 ? 'bg-purple-600 border-yellow-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  LEVEL 3: BOWSER
                </button>
                <button onClick={handleFinishAndPodium} className="p-3 rounded-xl border-2 border-yellow-500 bg-yellow-500/20 hover:bg-yellow-500/30 font-pixel text-xs text-yellow-300">
                  PODIUM
                </button>
              </div>
            </div>

            {/* Question Workflow */}
            <div className="bg-[#171B30] border-2 border-zinc-700 p-6 rounded-2xl shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="font-pixel text-xs text-yellow-400">QUESTION CONTROLS</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-400">TIMER:</span>
                  <span className={`font-pixel text-lg px-3 py-0.5 rounded border ${
                    remainingSeconds <= 5 ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-black border-yellow-400 text-yellow-300'
                  }`}>
                    {remainingSeconds}s
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select value={selectedQuestionId || ''} onChange={(e) => setSelectedQuestionId(Number(e.target.value))}
                  className="flex-1 bg-zinc-900 border-2 border-zinc-600 rounded-xl p-3 text-sm font-sans outline-none focus:border-yellow-400 text-zinc-100"
                >
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>Q#{q.id} [{q.category}] {q.prompt.slice(0, 75)}...</option>
                  ))}
                </select>
                <button onClick={() => selectedQuestionId && handleOpenQuestion(selectedQuestionId)}
                  className="px-5 py-3 bg-green-600 hover:bg-green-500 text-white font-pixel text-xs rounded-xl border-2 border-black flex items-center gap-2 shrink-0"
                >
                  <Play size={16} />
                  <span>LAUNCH</span>
                </button>
              </div>

              <div className="bg-black/40 p-4 rounded-xl border border-zinc-700 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300">Submissions: <strong>{totalAnswered}</strong> / {counts.connected}</span>
                  <span className="text-yellow-400 font-bold">{answeredPercent}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${answeredPercent}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <button onClick={handlePauseResume} className="py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl text-xs font-pixel text-zinc-200 flex items-center justify-center gap-1.5">
                  {gameState.timer_paused ? <Play size={16} /> : <Pause size={16} />}
                  <span>{gameState.timer_paused ? 'RESUME' : 'PAUSE'}</span>
                </button>
                <button onClick={handleExtend} className="py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl text-xs font-pixel text-zinc-200 flex items-center justify-center gap-1.5">
                  <Clock size={16} /><span>+10 SEC</span>
                </button>
                <button onClick={handleLock} className="py-3 bg-amber-700 hover:bg-amber-600 border border-amber-500 rounded-xl text-xs font-pixel text-white flex items-center justify-center gap-1.5">
                  <Lock size={16} /><span>LOCK</span>
                </button>
                <button onClick={handleReveal} className="py-3 bg-blue-600 hover:bg-blue-500 border border-blue-400 rounded-xl text-xs font-pixel text-white flex items-center justify-center gap-1.5">
                  <Eye size={16} /><span>REVEAL</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <button onClick={handleShowLeaderboard} className="py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl text-xs font-pixel text-yellow-300 flex items-center justify-center gap-1.5">
                  <Trophy size={16} /><span>LEADERBOARD</span>
                </button>
                <button onClick={handleCutoffL2} className="py-3 bg-purple-900 hover:bg-purple-800 border border-purple-500 rounded-xl text-xs font-pixel text-purple-200 flex items-center justify-center gap-1.5">
                  <Award size={16} /><span>TOP 50</span>
                </button>
                <button onClick={handleCutoffL3} className="py-3 bg-purple-900 hover:bg-purple-800 border border-purple-500 rounded-xl text-xs font-pixel text-purple-200 flex items-center justify-center gap-1.5">
                  <Award size={16} /><span>TOP 10</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Judge + Leaderboard */}
          <div className="col-span-4 space-y-6">
            <form onSubmit={handleSubmitJudgeScore} className="bg-[#171B30] border-2 border-purple-500/80 p-5 rounded-2xl shadow-xl space-y-4">
              <div className="font-pixel text-xs text-purple-400 flex items-center gap-2">
                <Sliders size={16} /><span>LEVEL 3 JUDGE RUBRIC</span>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">SELECT FINALIST</label>
                <select value={selectedFinalistId} onChange={(e) => setSelectedFinalistId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono text-white outline-none"
                >
                  {finalists.length === 0 && <option value="">No Finalists Yet</option>}
                  {finalists.map((f: any, i: number) => (
                    <option key={f.id} value={f.id}>#{i + 1} {f.name} ({f.student_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">JUDGE NAME</label>
                <input type="text" value={judgeName} onChange={(e) => setJudgeName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono text-white outline-none" />
              </div>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { label: 'Clarity & Structure', val: clarity, set: setClarity },
                  { label: 'Reasoning & Trade-offs', val: reasoning, set: setReasoning },
                  { label: 'Practical Judgement', val: judgement, set: setJudgement },
                  { label: 'Communication & Time', val: communication, set: setCommunication },
                ].map(({ label, val, set }) => (
                  <React.Fragment key={label}>
                    <div className="flex justify-between">
                      <span className="text-zinc-300">{label} (5):</span>
                      <span className="text-yellow-400 font-bold">{val}/5</span>
                    </div>
                    <input type="range" min="0" max="5" value={val} onChange={(e) => set(Number(e.target.value))} className="w-full accent-yellow-400" />
                  </React.Fragment>
                ))}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1 mt-2">REMARKS</label>
                  <input type="text" placeholder="Optional" value={judgeRemarks} onChange={(e) => setJudgeRemarks(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-mono text-white outline-none" />
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-700/60 flex justify-between items-center">
                <span className="font-mono text-xs text-zinc-300">TOTAL:</span>
                <span className="font-pixel text-base text-yellow-300">{clarity + reasoning + judgement + communication}/20</span>
              </div>
              <button type="submit" disabled={!selectedFinalistId}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 font-pixel text-xs rounded-xl border border-black disabled:opacity-50">
                SAVE SCORE
              </button>
            </form>

            <div className="bg-[#171B30] border-2 border-zinc-700 p-4 rounded-2xl shadow-lg space-y-3">
              <div className="font-pixel text-xs text-yellow-400">LEADERBOARD</div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
                {leaderboard.slice(0, 10).map((p: any, i: number) => (
                  <div key={p.id} className="flex justify-between p-1.5 bg-black/40 rounded border border-zinc-800">
                    <span className="truncate max-w-[140px]">#{i + 1} {p.name}</span>
                    <span className="text-yellow-400 font-bold">{p.total_coins}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Participants */}
      {activeTab === 'participants' && (
        <div className="bg-[#171B30] border-2 border-zinc-700 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-yellow-400" />
              <span className="font-pixel text-sm text-yellow-400">PARTICIPANT RECORDS</span>
            </div>
            <span className="text-xs font-mono text-zinc-400">{hostPlayers.length} registered</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-zinc-800/60 text-zinc-400 text-left">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">STUDENT ID</th>
                  <th className="px-4 py-2.5">NAME</th>
                  <th className="px-4 py-2.5">AVATAR</th>
                  <th className="px-4 py-2.5">STATUS</th>
                  <th className="px-4 py-2.5">L1 SCORE</th>
                  <th className="px-4 py-2.5">L2 SCORE</th>
                  <th className="px-4 py-2.5">JOINED</th>
                </tr>
              </thead>
              <tbody>
                {hostPlayers.map((p, i) => (
                  <tr key={p.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                    <td className="px-4 py-2 text-yellow-300">{p.student_id}</td>
                    <td className="px-4 py-2 text-zinc-200">{p.name}</td>
                    <td className="px-4 py-2 text-zinc-400">{p.avatar_id}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        p.is_connected ? 'bg-green-900/60 text-green-300 border border-green-700' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}>
                        {p.is_connected ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-300">{p.level1_score}</td>
                    <td className="px-4 py-2 text-zinc-300">{p.level2_score}</td>
                    <td className="px-4 py-2 text-zinc-500">{p.created_at ? new Date(p.created_at).toLocaleTimeString() : '-'}</td>
                  </tr>
                ))}
                {hostPlayers.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-zinc-500">No participants yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Pillar Answers */}
      {activeTab === 'answers' && (
        <div className="bg-[#171B30] border-2 border-zinc-700 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-yellow-400" />
              <span className="font-pixel text-sm text-yellow-400">GOLDEN PILLAR ANSWERS</span>
            </div>
            <span className="text-xs font-mono text-zinc-400">{pillarAnswers.length} submissions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-zinc-800/60 text-zinc-400 text-left">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">STUDENT ID</th>
                  <th className="px-4 py-2.5">NAME</th>
                  <th className="px-4 py-2.5">PILLAR</th>
                  <th className="px-4 py-2.5">ANSWER</th>
                  <th className="px-4 py-2.5">CORRECT</th>
                  <th className="px-4 py-2.5">TIME</th>
                </tr>
              </thead>
              <tbody>
                {pillarAnswers.map((a, i) => (
                  <tr key={a.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                    <td className="px-4 py-2 text-yellow-300">{a.student_id}</td>
                    <td className="px-4 py-2 text-zinc-200">{a.player_name}</td>
                    <td className="px-4 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-300 border border-yellow-700 text-[10px]">
                        PILLAR {a.pillar_id}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-200">{a.selected_option}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        a.is_correct ? 'bg-green-900/60 text-green-300 border border-green-700' : 'bg-red-900/60 text-red-300 border border-red-700'
                      }`}>
                        {a.is_correct ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{a.submitted_at ? new Date(a.submitted_at).toLocaleTimeString() : '-'}</td>
                  </tr>
                ))}
                {pillarAnswers.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No pillar answers submitted yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
