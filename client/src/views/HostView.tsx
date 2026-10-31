import React, { useState } from 'react';
import { useGameSocket } from '../utils/socket';
import { FINAL_FOLLOW_UP } from '../utils/gameContent';
import { AlertCircle, CheckCircle2, Clock, Download, Lock, Play, ShieldCheck, Trophy, Users, Wifi, WifiOff } from 'lucide-react';

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const HostView: React.FC = () => {
  const {
    isConnected, isAuthenticated, gameState, answerStats, counts, leaderboard, finalists,
    activeQuestion, lastError, clearError, send, remainingSeconds, speakerRemainingMs,
    levelQuestions, cutoff, judgeNames, judgeReadiness, judgeMatrix, recoveryToken, authenticateHost
  } = useGameSocket('HOST');
  const [pin, setPin] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [selectedFinalistId, setSelectedFinalistId] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [clarity, setClarity] = useState(3);
  const [reasoning, setReasoning] = useState(3);
  const [judgement, setJudgement] = useState(3);
  const [communication, setCommunication] = useState(3);
  const [remarks, setRemarks] = useState('');
  const [tieRound, setTieRound] = useState(1);
  const [recoveryId, setRecoveryId] = useState('');

  const currentQuestionId = levelQuestions.some(q => q.id === selectedQuestionId) ? selectedQuestionId : levelQuestions[0]?.id ?? null;
  const currentFinalistId = finalists.some(f => f.id === selectedFinalistId) ? selectedFinalistId : finalists[0]?.id || '';
  const currentJudgeName = judgeNames.includes(judgeName) ? judgeName : judgeNames[0] || '';

  const startLevel = (level: number) => send({ type: 'HOST_START_LEVEL', level });
  const launchQuestion = (id: number | null) => { if (id) send({ type: 'HOST_OPEN_QUESTION', questionId: id }); };
  const nextQuestion = levelQuestions[levelQuestions.findIndex(q => q.id === activeQuestion?.id) + 1];
  const answered = answerStats?.total || 0;
  const activeParticipants = gameState.sudden_death_active && cutoff?.status === 'PENDING'
    ? cutoff.pendingIds.length : gameState.current_level === 2 ? Math.min(50, counts.total) : counts.total;
  const questionRunning = gameState.game_status === 'QUESTION_ACTIVE' || gameState.game_status === 'PAUSED';
  const exportResults = () => {
    const rows = [['Rank', 'Roll number', 'Display name', 'Level 1 coins', 'Level 2 coins', 'Final rubric /20', 'Qualified for Level 2', 'Finalist'],
      ...leaderboard.map((p, index) => [index + 1, p.student_id, p.name, p.level1_score, p.level2_score,
        p.level3_score, p.is_qualified_level2 ? 'Yes' : 'No', p.is_qualified_level3 ? 'Yes' : 'No'])];
    const blob = new Blob([rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `mario-career-quest-level-${gameState.current_level}-results.csv`; link.click();
    URL.revokeObjectURL(url);
  };
  const scoreJudge = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentFinalistId || !currentJudgeName) return;
    send({ type: 'HOST_SUBMIT_JUDGE_SCORE', finalist_id: currentFinalistId, judge_name: currentJudgeName,
      clarity_score: clarity, reasoning_score: reasoning, judgement_score: judgement,
      communication_score: communication, remarks });
  };
  const selectedSpeaker = finalists.find(f => f.id === gameState.speaker_id);

  if (!isAuthenticated) return (
    <main className="min-h-screen bg-[#101629] text-white grid place-items-center p-4">
      <form onSubmit={e => { e.preventDefault(); authenticateHost(pin); }} className="w-full max-w-md bg-[#192134] border-4 border-yellow-400 rounded-2xl p-8 space-y-5 shadow-2xl">
        <div className="text-center"><Lock className="mx-auto text-yellow-300 mb-3" size={36} /><h1 className="font-pixel text-lg text-yellow-300 leading-relaxed">HOST CONTROL ROOM</h1><p className="text-sm text-slate-300 mt-3">Dean Career Cloud · Event operator</p></div>
        <label className="block text-sm font-semibold" htmlFor="host-pin">Host PIN</label>
        <input id="host-pin" type="password" autoComplete="off" required value={pin} onChange={e => setPin(e.target.value)} className="w-full bg-slate-950 border-2 border-slate-500 focus:border-yellow-300 rounded-lg px-4 py-3 text-lg outline-none" />
        <button disabled={!isConnected} className="w-full min-h-12 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-bold focus-visible:outline-4 focus-visible:outline-yellow-300">{isConnected ? 'Enter control room' : 'Connecting…'}</button>
        {lastError && <p role="alert" className="text-red-300 text-sm">{lastError}</p>}
      </form>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#101629] text-white p-4 md:p-7 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-700 pb-5">
        <div><p className="font-pixel text-xs text-yellow-300 mb-2">DEAN CAREER CLOUD · BENNETT UNIVERSITY</p><h1 className="text-3xl font-black">Mario Career Quest</h1><p className="text-slate-300 mt-1">Live event control · Level {gameState.current_level} · {gameState.game_status.replaceAll('_', ' ')}</p></div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={`flex items-center gap-2 ${isConnected ? 'text-green-300' : 'text-red-300'}`}>{isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}{isConnected ? 'Connected' : 'Reconnecting'}</span>
          <span className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg"><Users size={18} />{counts.connected}/{counts.total} online</span>
          <button onClick={exportResults} className="flex items-center gap-2 px-3 py-2 min-h-11 rounded-lg border border-slate-500 hover:bg-slate-800 focus-visible:outline-4 focus-visible:outline-yellow-300"><Download size={17} /> Export CSV</button>
        </div>
      </header>
      {lastError && <div role="alert" className="flex justify-between items-start gap-3 bg-red-950 border-2 border-red-500 p-4 rounded-lg"><span><AlertCircle className="inline mr-2" size={18} />{lastError}</span><button onClick={clearError} className="underline">Dismiss</button></div>}
      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] gap-5">
        <div className="space-y-5">
          <section className="bg-[#192134] border-2 border-slate-600 rounded-xl p-5 space-y-4" aria-labelledby="round-controls">
            <h2 id="round-controls" className="font-pixel text-sm text-yellow-300">ROUND CONTROL</h2>
            <p className="text-sm text-slate-200">Scoring: 100 coins per correct answer plus up to 20 speed coins. Level 2 starts fresh. Finalists are judged separately.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <button onClick={() => startLevel(1)} disabled={gameState.game_status !== 'LOBBY'} className="event-button bg-red-600 disabled:opacity-40">Start Level 1</button>
              <button onClick={() => startLevel(2)} disabled={cutoff?.level !== 2 || cutoff.status !== 'COMPLETE'} className="event-button bg-blue-600 disabled:opacity-40">Start Level 2</button>
              <button onClick={() => send({ type: 'HOST_START_BOWSER_STAGE' })} disabled={cutoff?.level !== 3 || cutoff.status !== 'COMPLETE'} className="event-button bg-purple-700 disabled:opacity-40">Start Boss Stage</button>
            </div>
            {gameState.current_level <= 2 && <div className="space-y-3 border-t border-slate-600 pt-4">
              <label htmlFor="question-select" className="block font-semibold text-sm">Question to open</label>
              <select id="question-select" value={currentQuestionId ?? ''} onChange={e => setSelectedQuestionId(Number(e.target.value))} className="w-full bg-slate-950 border-2 border-slate-500 rounded-lg p-3 text-sm">
                {levelQuestions.map((q, i) => <option key={q.id} value={q.id}>{q.is_practice ? 'Practice' : `Question ${i}`} · {q.prompt}</option>)}
              </select>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => launchQuestion(currentQuestionId)} disabled={!currentQuestionId || gameState.game_status === 'QUESTION_ACTIVE' || gameState.game_status === 'PAUSED'} className="event-button bg-green-700 disabled:opacity-40"><Play size={17} /> Open selected</button>
                <button onClick={() => launchQuestion(nextQuestion?.id)} disabled={!nextQuestion || gameState.game_status === 'QUESTION_ACTIVE' || gameState.game_status === 'PAUSED'} className="event-button bg-blue-700 disabled:opacity-40">Next question</button>
              </div>
              {activeQuestion && <div className="bg-slate-950 border border-slate-600 rounded-lg p-4 text-sm"><b>Live: {activeQuestion.prompt}</b><p className="text-yellow-300 mt-2">Host answer key: {activeQuestion.correct_option}</p></div>}
            </div>}
          </section>

          <section className="bg-[#192134] border-2 border-slate-600 rounded-xl p-5 space-y-4" aria-labelledby="timer-controls">
            <div className="flex items-center justify-between gap-3"><h2 id="timer-controls" className="font-pixel text-sm text-yellow-300">QUESTION TIMER</h2><span className="font-pixel text-2xl text-white">{remainingSeconds}s</span></div>
            <p className="text-sm text-slate-200">{answered} / {activeParticipants} answers received</p>
            <div className="h-3 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-yellow-400" style={{ width: `${Math.min(100, activeParticipants ? answered / activeParticipants * 100 : 0)}%` }} /></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={() => send({ type: gameState.timer_paused ? 'HOST_RESUME_TIMER' : 'HOST_PAUSE_TIMER' })} disabled={!questionRunning} className="event-button bg-slate-700 disabled:opacity-40">{gameState.timer_paused ? 'Resume' : 'Pause'}</button>
              <button onClick={() => send({ type: 'HOST_EXTEND_TIMER', seconds: 10 })} disabled={!questionRunning} className="event-button bg-slate-700 disabled:opacity-40">+10 seconds</button>
              <button onClick={() => send({ type: 'HOST_LOCK_QUESTION' })} disabled={!questionRunning} className="event-button bg-amber-700 disabled:opacity-40">Lock</button>
              <button onClick={() => send({ type: 'HOST_REVEAL_ANSWER' })} disabled={gameState.game_status !== 'QUESTION_LOCKED'} className="event-button bg-blue-700 disabled:opacity-40">Reveal</button>
            </div>
            {['QUESTION_LOCKED', 'REVEAL'].includes(gameState.game_status) && !gameState.sudden_death_active && <button onClick={() => { if (window.confirm('Void this question, remove its awarded coins, and make it available to replay?')) send({ type: 'HOST_VOID_QUESTION' }); }} className="text-amber-300 underline text-sm">Void question and allow replay</button>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-600 pt-4">
              <button onClick={() => send({ type: 'HOST_SHOW_LEADERBOARD' })} disabled={questionRunning || gameState.current_level > 2} className="event-button bg-slate-700 disabled:opacity-40"><Trophy size={17} /> Leaderboard</button>
              <button onClick={() => { if (window.confirm('Review and select the top 50 by Level 1 score?')) send({ type: 'HOST_CUTOFF_L2' }); }} disabled={gameState.current_level !== 1 || questionRunning} className="event-button bg-purple-700 disabled:opacity-40">Top 50 cut-off</button>
              <button onClick={() => { if (window.confirm('Review and select the top 10 by Level 2 score only?')) send({ type: 'HOST_CUTOFF_L3' }); }} disabled={gameState.current_level !== 2 || questionRunning} className="event-button bg-purple-700 disabled:opacity-40">Top 10 cut-off</button>
            </div>
            {cutoff?.status === 'PENDING' && <div className="bg-amber-950 border-2 border-amber-400 rounded-lg p-4 space-y-3"><p className="font-semibold">Cut-off tie: {cutoff.pendingIds.length} players compete for {cutoff.targetCount - cutoff.safeIds.length} place(s).</p><button onClick={() => send({ type: 'HOST_TRIGGER_SUDDEN_DEATH' })} className="event-button bg-amber-600 text-black">Open sudden-death question</button></div>}
            {cutoff?.status === 'COMPLETE' && <p className="flex items-center gap-2 text-green-300"><CheckCircle2 size={18} /> {cutoff.safeIds.length} qualifiers selected. Export CSV for independent verification.</p>}
          </section>

          <section className="bg-[#192134] border-2 border-slate-600 rounded-xl p-5 space-y-4" aria-labelledby="final-controls">
            <h2 id="final-controls" className="font-pixel text-sm text-purple-300">BOSS STAGE</h2>
            <label htmlFor="speaker" className="block text-sm font-semibold">Current speaker</label>
            <select id="speaker" value={gameState.speaker_id || ''} onChange={e => send({ type: 'HOST_SELECT_SPEAKER', finalist_id: e.target.value })} className="w-full bg-slate-950 border-2 border-slate-500 rounded-lg p-3 text-sm"><option value="">Select finalist</option>{finalists.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
            <p className="text-sm">{selectedSpeaker?.name || 'No speaker selected'} · <strong className="font-pixel text-lg text-yellow-300">{Math.floor(speakerRemainingMs / 60000)}:{String(Math.ceil(speakerRemainingMs / 1000) % 60).padStart(2, '0')}</strong></p>
            <div className="flex flex-wrap gap-2"><button onClick={() => send({ type: gameState.speaker_running ? 'HOST_SPEAKER_PAUSE' : 'HOST_SPEAKER_START' })} disabled={gameState.game_status !== 'BOWSER_STAGE' || !gameState.speaker_id} className="event-button bg-purple-700 disabled:opacity-40">{gameState.speaker_running ? 'Pause speaker' : 'Start speaker'}</button><button onClick={() => send({ type: 'HOST_SPEAKER_RESET' })} disabled={gameState.game_status !== 'BOWSER_STAGE'} className="event-button bg-slate-700 disabled:opacity-40"><Clock size={16} /> Reset 2:00</button></div>
          </section>
        </div>

        <div className="space-y-5">
          <form onSubmit={scoreJudge} className="bg-[#192134] border-2 border-purple-500 rounded-xl p-5 space-y-4" aria-labelledby="judge-form">
            <h2 id="judge-form" className="font-pixel text-sm text-purple-300">JUDGE RUBRIC</h2>
            <p className="text-sm text-slate-300">Each named judge scores every finalist independently. Scores average out of 20.</p>
            <label className="block text-sm">Finalist<select value={currentFinalistId} onChange={e => setSelectedFinalistId(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-500 rounded-lg p-3"><option value="">Select</option>{finalists.map(f => <option key={f.id} value={f.id}>{f.name} · {f.student_id}</option>)}</select></label>
            <label className="block text-sm">Judge<select value={currentJudgeName} onChange={e => setJudgeName(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-500 rounded-lg p-3">{judgeNames.map(name => <option key={name}>{name}</option>)}</select></label>
            {([['Clarity and structure', clarity, setClarity], ['Reasoning and trade-offs', reasoning, setReasoning], ['Practical judgement', judgement, setJudgement], ['Communication', communication, setCommunication]] as const).map(([label, value, setValue]) => <label key={label} className="block text-sm">{label}: <strong className="text-yellow-300">{value}/5</strong><input type="range" min="0" max="5" value={value} onChange={e => setValue(Number(e.target.value))} className="w-full min-h-11 accent-yellow-400" /></label>)}
            <label className="block text-sm">Remarks<input value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-500 rounded-lg p-3" /></label>
            <p className="text-yellow-300 font-semibold">Total: {clarity + reasoning + judgement + communication}/20</p>
            <button disabled={gameState.game_status !== 'BOWSER_STAGE' || !currentFinalistId || !currentJudgeName} className="event-button bg-purple-700 w-full disabled:opacity-40">Save judge score</button>
          </form>

          <section className="bg-[#192134] border-2 border-slate-600 rounded-xl p-5 space-y-4" aria-labelledby="result-check">
            <h2 id="result-check" className="font-pixel text-sm text-yellow-300">RESULT CHECK</h2>
            <p className="text-sm">Judge scores: {judgeReadiness?.completed ?? 0}/{judgeReadiness?.expected ?? 0}</p>
            {finalists.length > 0 && <div className="overflow-x-auto rounded-lg border border-slate-600">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-slate-950 text-yellow-300"><tr><th className="p-2">Finalist</th><th className="p-2">Judge</th><th className="p-2">Clarity</th><th className="p-2">Reasoning</th><th className="p-2">Judgement</th><th className="p-2">Communication</th><th className="p-2">Total</th></tr></thead>
                <tbody>{finalists.flatMap(finalist => judgeNames.map(judge => {
                  const score = judgeMatrix.find(item => item.finalist_id === finalist.id && item.judge_name === judge);
                  return <tr key={`${finalist.id}:${judge}`} className="border-t border-slate-700"><td className="p-2 font-semibold">{finalist.name}</td><td className="p-2">{judge}</td><td className="p-2">{score?.clarity_score ?? '—'}</td><td className="p-2">{score?.reasoning_score ?? '—'}</td><td className="p-2">{score?.judgement_score ?? '—'}</td><td className="p-2">{score?.communication_score ?? '—'}</td><td className="p-2 font-bold">{score?.total_score ?? '—'}</td></tr>;
                }))}</tbody>
              </table>
            </div>}
            {!!judgeReadiness?.missing?.length && <p className="text-amber-300 text-sm">Missing: {judgeReadiness.missing.slice(0, 3).map(item => `${item.name} / ${item.judge}`).join(', ')}{judgeReadiness.missing.length > 3 ? '…' : ''}</p>}
            {!!judgeReadiness?.ties?.length && <div className="space-y-3 bg-purple-950 border border-purple-500 p-3 rounded-lg"><p className="text-sm">Podium tie: {judgeReadiness.ties.map(p => p.name).join(', ')}. Ask each the same follow-up; score clarity and reasoning.</p><p className="text-sm font-semibold text-yellow-200">{FINAL_FOLLOW_UP}</p><label className="block text-sm">Follow-up round<input type="number" min="1" max="20" value={tieRound} onChange={e => setTieRound(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-500 rounded-lg p-2 mt-1" /></label><p className="text-xs">Use the selected finalist and judge above. Clarity and reasoning sliders above supply the follow-up scores.</p><button onClick={() => send({ type: 'HOST_SUBMIT_FINAL_TIEBREAK', finalist_id: currentFinalistId, judge_name: currentJudgeName, round_no: tieRound, clarity_score: clarity, reasoning_score: reasoning })} className="event-button bg-purple-700">Save follow-up score</button></div>}
            <button disabled={!judgeReadiness?.ready} onClick={() => { if (window.confirm('A second team member has checked all scores and winners?')) send({ type: 'HOST_VERIFY_RESULTS' }); }} className="event-button bg-green-700 w-full disabled:opacity-40"><ShieldCheck size={17} /> Mark independently verified</button>
            <button disabled={!gameState.results_verified} onClick={() => { if (window.confirm('Reveal the verified podium on the projector?')) send({ type: 'HOST_FINISH_AND_PODIUM' }); }} className="event-button bg-yellow-500 text-black w-full disabled:opacity-40"><Trophy size={17} /> Reveal podium</button>
          </section>

          <section className="bg-[#192134] border-2 border-slate-600 rounded-xl p-5 space-y-3" aria-labelledby="operations">
            <h2 id="operations" className="font-pixel text-sm text-yellow-300">OPERATIONS</h2>
            <p className="text-sm text-slate-300">To move a registered player to another phone, verify their identity, issue a recovery link, and have them open it on that phone.</p>
            <input aria-label="Roll number for session recovery" placeholder="Roll number" value={recoveryId} onChange={e => setRecoveryId(e.target.value)} className="w-full bg-slate-950 border border-slate-500 rounded-lg p-3" />
            <button onClick={() => send({ type: 'HOST_RECOVER_PLAYER', studentId: recoveryId })} disabled={!recoveryId.trim()} className="event-button bg-slate-700 disabled:opacity-40">Issue recovery link</button>
            {recoveryToken && <div className="break-all text-xs bg-slate-950 p-3 rounded-lg"><p>For {recoveryToken.studentId}:</p><p>{`${window.location.origin}/play?session=${encodeURIComponent(recoveryToken.sessionToken)}`}</p><button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/play?session=${encodeURIComponent(recoveryToken.sessionToken)}`)} className="underline text-yellow-300 mt-2">Copy link</button></div>}
            <button onClick={() => { if (window.confirm('Reset all scores, answers, and cut-offs? This cannot be undone.')) send({ type: 'HOST_RESET_GAME' }); }} className="text-red-300 underline text-sm">Reset event scores</button>
          </section>
        </div>
      </div>
    </main>
  );
};
