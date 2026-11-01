import React, { useState } from 'react';
import { useGameSocket } from '../utils/socket';
import { FINAL_FOLLOW_UP } from '../utils/gameContent';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Download, Lock, Pause, Play, RotateCcw, ShieldCheck, Trash2, Trophy, Users, Wifi, WifiOff } from 'lucide-react';

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const HostView: React.FC = () => {
  const {
    isConnected, isAuthenticated, gameState, counts, pipeReadyCount, totalPipes, leaderboard, finalists,
    lastError, clearError, send, speakerRemainingMs,
    cutoff, judgeNames, judgeReadiness, judgeMatrix, authenticateHost
  } = useGameSocket('HOST');
  const [pin, setPin] = useState('');
  const [selectedFinalistId, setSelectedFinalistId] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [clarity, setClarity] = useState(3);
  const [reasoning, setReasoning] = useState(3);
  const [judgement, setJudgement] = useState(3);
  const [communication, setCommunication] = useState(3);
  const [remarks, setRemarks] = useState('');
  const [tieRound, setTieRound] = useState(1);

  const currentFinalistId = finalists.some(f => f.id === selectedFinalistId) ? selectedFinalistId : finalists[0]?.id || '';
  const currentJudgeName = judgeNames.includes(judgeName) ? judgeName : judgeNames[0] || '';

  const startLevel = (level: number) => send({ type: 'HOST_START_LEVEL', level });
  const exportResults = () => {
    const rows = [['Rank', 'Roll number', 'Display name', 'Level 1 points', 'Level 2 points', 'Final rubric /20', 'Level 1 top 50', 'Finalist'],
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
          <span className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg"><Users size={18} />{counts.connected}/{counts.total} online · {pipeReadyCount} at pipes</span>
          <button onClick={exportResults} className="flex items-center gap-2 px-3 py-2 min-h-11 rounded-lg border border-slate-500 hover:bg-slate-800 focus-visible:outline-4 focus-visible:outline-yellow-300"><Download size={17} /> Export CSV</button>
        </div>
      </header>
      {lastError && <div role="alert" className="flex justify-between items-start gap-3 bg-red-950 border-2 border-red-500 p-4 rounded-lg"><span><AlertCircle className="inline mr-2" size={18} />{lastError}</span><button onClick={clearError} className="underline">Dismiss</button></div>}
      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] gap-5">
        <div className="space-y-5">
          <section className="bg-[#192134] border-2 border-slate-600 rounded-xl p-5 space-y-4" aria-labelledby="round-controls">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h2 id="round-controls" className="font-pixel text-sm text-yellow-300">ROUND & LEVEL CONTROL</h2>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-yellow-500/20 text-yellow-300 border border-yellow-400/40">
                {gameState.game_status.replaceAll('_', ' ')}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Students play self-paced inside the 2D Mario World runner. Each pillar contains a career challenge (100 coins + speed bonus). Flagpole awards completion bonus.
            </p>

            {/* LEVEL START BUTTONS */}
            <div className="grid sm:grid-cols-3 gap-3">
              <button
                onClick={() => startLevel(1)}
                disabled={gameState.game_status !== 'LOBBY'}
                className="event-button bg-red-600 hover:bg-red-500 font-pixel text-xs py-3 disabled:opacity-40"
              >
                ▶ Start Level 1
              </button>
              <button
                onClick={() => startLevel(2)}
                disabled={gameState.current_level !== 1 ||
                  (gameState.game_status !== 'LEVEL_LEADERBOARD' &&
                   (cutoff?.level !== 2 || cutoff.status !== 'COMPLETE'))}
                className="event-button bg-blue-600 hover:bg-blue-500 font-pixel text-xs py-3 disabled:opacity-40"
              >
                ▶ Start Level 2 (All Players)
              </button>
              <button
                onClick={() => send({ type: 'HOST_START_BOWSER_STAGE' })}
                disabled={cutoff?.level !== 3 || cutoff.status !== 'COMPLETE' || gameState.game_status === 'BOWSER_STAGE'}
                className="event-button bg-purple-700 hover:bg-purple-600 font-pixel text-xs py-3 disabled:opacity-40"
              >
                ▶ Bowser Boss Stage
              </button>
            </div>

            {/* LIVE LEVEL STATUS & TELEMETRY */}
            {gameState.game_status === 'LOBBY' && (
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-yellow-300 font-pixel text-xs">
                  <Clock size={16} /> WAITING IN LOBBY
                </div>
                <p className="text-xs text-slate-300">
                  {counts.connected} / {counts.total} players connected in the waiting room. Click <strong>"▶ Start Level 1"</strong> above to launch the 2D runner on everyone's screens!
                </p>
              </div>
            )}

            {gameState.current_level === 1 && gameState.game_status !== 'LOBBY' && (
              <div className="p-4 bg-green-950/70 border-2 border-green-500/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-yellow-300 flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
                    LEVEL 1 IS LIVE (WORLD 1-1)
                  </span>
                  <span className="text-xs font-mono text-green-300 bg-green-900/60 px-2.5 py-0.5 rounded border border-green-600">
                    Flagpole: {leaderboard.filter(p => (p.completed_pipes || 0) >= totalPipes).length} / {counts.total} Cleared
                  </span>
                </div>
                <p className="text-xs text-green-100/90 leading-relaxed">
                  Students are jumping on pillars, answering career challenges, and racing to the flagpole. Projector displays the live real-time leaderboard.
                </p>
              </div>
            )}

            {gameState.current_level === 2 && gameState.game_status !== 'LOBBY' && (
              <div className="p-4 bg-blue-950/70 border-2 border-blue-500/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-yellow-300 flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
                    LEVEL 2 IS LIVE (WORLD 2-1)
                  </span>
                  <span className="text-xs font-mono text-blue-300 bg-blue-900/60 px-2.5 py-0.5 rounded border border-blue-600">
                    Flagpole: {leaderboard.filter(p => (p.completed_pipes || 0) >= totalPipes).length} / {counts.total} Cleared
                  </span>
                </div>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  All registered players can answer {totalPipes} pipe questions in Level 2, including players outside the Level 1 top 50. The top 10 by Level 2 score advance to the Bowser Boss Stage!
                </p>
              </div>
            )}

            {/* LIVE GAME CONTROLS (Pause, Resume, Cut-offs, Show Leaderboard) */}
            {gameState.current_level >= 1 && gameState.game_status !== 'BOWSER_STAGE' && gameState.game_status !== 'PODIUM_WINNERS' && (
              <div className="space-y-3 border-t border-slate-700 pt-4">
                <div className="font-pixel text-xs text-yellow-300">LIVE GAME CONTROLS</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Pause / Resume Button */}
                  {gameState.game_status === 'PAUSED' ? (
                    <button
                      onClick={() => send({ type: 'HOST_RESUME_TIMER' })}
                      className="event-button bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 text-xs"
                    >
                      <Play size={16} /> Resume Game
                    </button>
                  ) : (
                    <button
                      onClick={() => send({ type: 'HOST_PAUSE_TIMER' })}
                      className="event-button bg-amber-600 hover:bg-amber-500 flex items-center justify-center gap-2 text-xs"
                    >
                      <Pause size={16} /> Pause Game
                    </button>
                  )}

                  {/* Cut-off Buttons */}
                  {gameState.current_level === 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm('End Level 1 and select the top 50 players by score?')) {
                          send({ type: 'HOST_CUTOFF_L2' });
                        }
                      }}
                      className="event-button bg-purple-700 hover:bg-purple-600 flex items-center justify-center gap-2 text-xs"
                    >
                      <CheckCircle2 size={16} /> End L1 & Record Top 50
                    </button>
                  )}

                  {gameState.current_level === 2 && (
                    <button
                      onClick={() => {
                        if (window.confirm('End Level 2 and select the top 10 finalists by Level 2 score?')) {
                          send({ type: 'HOST_CUTOFF_L3' });
                        }
                      }}
                      className="event-button bg-purple-700 hover:bg-purple-600 flex items-center justify-center gap-2 text-xs"
                    >
                      <CheckCircle2 size={16} /> End L2 & Select Top 10
                    </button>
                  )}

                  {/* Show Leaderboard on Projector */}
                  <button
                    onClick={() => send({ type: 'HOST_SHOW_LEADERBOARD' })}
                    className="event-button bg-slate-700 hover:bg-slate-600 flex items-center justify-center gap-2 text-xs"
                  >
                    <Trophy size={16} /> Projector Leaderboard
                  </button>
                </div>

                {/* Tie / Sudden Death Notification */}
                {cutoff?.status === 'PENDING' && (
                  <div className="bg-amber-950 border-2 border-amber-400 rounded-lg p-4 space-y-2">
                    <p className="font-semibold text-sm text-yellow-300">
                      ⚠️ Cut-off tie: {cutoff.pendingIds.length} players tied for the last {cutoff.targetCount - cutoff.safeIds.length} qualifying spot(s)!
                    </p>
                    <button
                      onClick={() => send({ type: 'HOST_TRIGGER_SUDDEN_DEATH' })}
                      className="event-button bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                    >
                      Open Sudden-Death Tiebreaker Question
                    </button>
                  </div>
                )}

                {cutoff?.status === 'COMPLETE' && (
                  <div className="p-3 bg-green-950/60 border border-green-500/80 rounded-lg text-xs text-green-300 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-400" />
                    <span><strong>{cutoff.safeIds.length} Qualifiers Confirmed!</strong> Export CSV or proceed to next round.</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* BOSS STAGE SECTION */}
          <section className="bg-[#192134] border-2 border-slate-600 rounded-xl p-5 space-y-4" aria-labelledby="final-controls">
            <h2 id="final-controls" className="font-pixel text-sm text-purple-300">STAGE 3: BOWSER BOSS ARENA (TOP 10)</h2>
            <label htmlFor="speaker" className="block text-sm font-semibold">Current Finalist Speaker</label>
            <select
              id="speaker"
              value={gameState.speaker_id || ''}
              onChange={e => send({ type: 'HOST_SELECT_SPEAKER', finalist_id: e.target.value })}
              className="w-full bg-slate-950 border-2 border-slate-500 rounded-lg p-3 text-sm"
            >
              <option value="">Select finalist to present</option>
              {finalists.map(f => <option key={f.id} value={f.id}>{f.name} ({f.student_id})</option>)}
            </select>
            <p className="text-sm">
              {selectedSpeaker?.name || 'No speaker selected'} ·{' '}
              <strong className="font-pixel text-lg text-yellow-300">
                {Math.floor(speakerRemainingMs / 60000)}:{String(Math.ceil(speakerRemainingMs / 1000) % 60).padStart(2, '0')}
              </strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => send({ type: gameState.speaker_running ? 'HOST_SPEAKER_PAUSE' : 'HOST_SPEAKER_START' })}
                disabled={gameState.game_status !== 'BOWSER_STAGE' || !gameState.speaker_id}
                className="event-button bg-purple-700 disabled:opacity-40"
              >
                {gameState.speaker_running ? 'Pause speaker' : 'Start 2:00 timer'}
              </button>
              <button
                onClick={() => send({ type: 'HOST_SPEAKER_RESET' })}
                disabled={gameState.game_status !== 'BOWSER_STAGE'}
                className="event-button bg-slate-700 disabled:opacity-40"
              >
                <Clock size={16} /> Reset 2:00
              </button>
            </div>
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

          <section className="bg-red-950/20 border-2 border-red-500/60 rounded-xl p-5 space-y-4" aria-labelledby="danger-zone">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={20} className="animate-pulse" />
              <h2 id="danger-zone" className="font-pixel text-sm tracking-wider uppercase">DANGER ZONE: EVENT RESET</h2>
            </div>
            <p className="text-xs text-red-200/80 leading-relaxed">
              Use these controls to reset the live event. Choose carefully between resetting the round scores while keeping students logged in, or performing a complete wipe.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-slate-900/80 border border-amber-500/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-amber-300">Option A: Reset to Lobby (Keep Players)</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">Safe Restart</span>
                </div>
                <p className="text-xs text-slate-400">
                  Resets game round back to Level 0 Lobby. Wipes scores, question answers, pipe quests, flagpole claims, and cutoffs. All registered students remain connected on their phones and return to the lobby waiting room.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm("⚠️ RESET TO LOBBY:\n\nThis will reset all scores, answers, pipe quests, and cut-offs back to Level 0 Lobby.\n\nPlayers will STAY registered and connected in the waiting room.\n\nAre you sure you want to proceed?")) {
                      send({ type: 'HOST_RESET_GAME', wipePlayers: false });
                    }
                  }}
                  className="event-button bg-amber-600 hover:bg-amber-500 text-white w-full flex items-center justify-center gap-2 text-sm"
                >
                  <RotateCcw size={16} /> Reset Scores & Return to Lobby
                </button>
              </div>

              <div className="p-3 bg-red-950/40 border border-red-600/40 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-red-300">Option B: Full Factory Reset (Wipe Everything)</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-red-600/20 text-red-300 rounded border border-red-600/40">Full Wipe</span>
                </div>
                <p className="text-xs text-red-200/70">
                  Permanently deletes all registered students and session tokens. All connected student devices will be kicked back to the registration screen. Resets all game progress and tables to zero.
                </p>
                <button
                  onClick={() => {
                    const confirmInput = window.prompt("🚨 FULL FACTORY RESET:\n\nThis will permanently DELETE all registered players, wipe all answers, scores, and tokens, and return ALL student phones to the registration screen.\n\nType 'RESET' to confirm:");
                    if (confirmInput === 'RESET') {
                      send({ type: 'HOST_RESET_GAME', wipePlayers: true });
                    } else if (confirmInput !== null) {
                      alert("Factory reset cancelled (you did not type 'RESET').");
                    }
                  }}
                  className="event-button bg-red-700 hover:bg-red-600 text-white w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Trash2 size={16} /> Full Factory Reset (Wipe All Players)
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
