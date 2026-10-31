import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play, RotateCcw, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import type { SocketHookState } from '../utils/socket';
import { GameEngine } from './engine';
import { gameAudio } from './audio';

interface Props { socket: SocketHookState }
const QUESTION_STATES = ['QUESTION_ACTIVE', 'PAUSED', 'QUESTION_LOCKED', 'REVEAL'];

export const GameView: React.FC<Props> = ({ socket }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [pipeIndex, setPipeIndex] = useState<number | null>(null);
  const [closedQuestionId, setClosedQuestionId] = useState<number | null>(null);
  const [locallyPaused, setLocallyPaused] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(gameAudio.isMuted());
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const avatarId = socket.player?.avatar_id;
  const playerId = socket.player?.id;
  const level = socket.gameState.current_level;
  const isConnected = socket.isConnected;
  const send = socket.send;

  useEffect(() => {
    const checkSize = () => {
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setShowTouchControls(touch);
      setShowRotatePrompt(touch && window.innerHeight > window.innerWidth);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !avatarId) return;
    const engine = new GameEngine(canvasRef.current, avatarId === 'luigi' ? 'luigi' : 'mario');
    engineRef.current = engine;
    engine.start();
    const resize = () => engine.resize();
    window.addEventListener('resize', resize);
    const poll = window.setInterval(() => {
      const contact = engine.getPipeContact();
      setPipeIndex(previous => previous === contact ? previous : contact);
      setLevelComplete(previous => previous === engine.gameState.levelComplete ? previous : engine.gameState.levelComplete);
    }, 80);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('resize', resize);
      engine.stop();
      engineRef.current = null;
    };
  }, [avatarId]);

  useEffect(() => {
    engineRef.current?.setWorldLabel(level || 1);
  }, [level]);

  useEffect(() => {
    if (isConnected && playerId) send({ type: 'CLIENT_PIPE_READY', ready: pipeIndex !== null });
  }, [pipeIndex, isConnected, playerId, level, send]);

  const question = socket.activeQuestion;
  const questionVisible = !!question && pipeIndex !== null && closedQuestionId !== question.id &&
    QUESTION_STATES.includes(socket.gameState.game_status) && !socket.isSpectator;
  const spectatorLevel = level === 2 && !socket.player?.is_qualified_level2;
  const finalStage = socket.gameState.game_status === 'BOWSER_STAGE';
  const podiumStage = socket.gameState.game_status === 'PODIUM_WINNERS';
  const stageOverlay = spectatorLevel || finalStage || podiumStage;

  useEffect(() => { engineRef.current?.setExternalPause(questionVisible || stageOverlay); }, [questionVisible, stageOverlay]);

  const resetRun = () => {
    engineRef.current?.reset();
    engineRef.current?.setWorldLabel(socket.gameState.current_level || 1);
    setPipeIndex(null);
    setLocallyPaused(false);
    setLevelComplete(false);
  };
  const togglePause = () => {
    engineRef.current?.togglePause();
    setLocallyPaused(value => !value);
  };
  const toggleMute = () => setIsMuted(gameAudio.toggleMute());
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };
  const answers = question ? [
    ['A', question.option_a], ['B', question.option_b], ['C', question.option_c], ['D', question.option_d]
  ].filter((option): option is [string, string] => !!option[1]) : [];
  const questionIsLive = socket.gameState.game_status === 'QUESTION_ACTIVE';
  const awaitingPipe = questionIsLive && pipeIndex === null && !socket.isSpectator && !socket.myAnswer;

  return <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-sky-700 text-white" style={{ touchAction: 'none' }}>
    <canvas ref={canvasRef} className="block h-full w-full" style={{ imageRendering: 'pixelated' }} aria-label="Side-scrolling career quest game world" />

    <header className="absolute left-2 right-2 top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/30 bg-slate-950/85 px-3 py-2 shadow-lg backdrop-blur-sm sm:left-4 sm:right-4 sm:top-4 sm:px-5">
      <div className="flex items-center gap-3"><span className="font-pixel text-[10px] text-yellow-300 sm:text-xs">CAREER QUEST</span><span className="hidden text-sm text-slate-200 sm:inline">{socket.player?.name}</span><span className="rounded bg-green-700/80 px-2 py-1 text-xs font-bold">LEVEL {socket.gameState.current_level || 1}</span></div>
      <div className="flex items-center gap-3 text-xs sm:text-sm"><span className="font-bold text-yellow-200">🪙 {socket.player?.total_coins ?? 0} QUIZ COINS</span><span className={pipeIndex !== null ? 'text-green-300' : 'text-white/80'}>{pipeIndex !== null ? '● ON PIPE' : '○ FIND A PIPE'}</span><span title={socket.isConnected ? 'Connected' : 'Reconnecting'}>{socket.isConnected ? <Wifi size={17} className="text-green-300" /> : <WifiOff size={17} className="text-red-300" />}</span></div>
    </header>

    <div className="absolute right-3 top-20 z-20 flex gap-2 sm:top-20">
      <button onClick={toggleMute} aria-label={isMuted ? 'Unmute game audio' : 'Mute game audio'} className="rounded-lg border border-white/30 bg-slate-950/75 p-2">{isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      <button onClick={togglePause} aria-label={locallyPaused ? 'Resume movement' : 'Pause movement'} className="rounded-lg border border-white/30 bg-slate-950/75 p-2">{locallyPaused ? <Play size={18} /> : <Pause size={18} />}</button>
      <button onClick={resetRun} aria-label="Restart platform run" className="rounded-lg border border-white/30 bg-slate-950/75 p-2"><RotateCcw size={18} /></button>
      <button onClick={toggleFullscreen} aria-label="Toggle fullscreen" className="rounded-lg border border-white/30 bg-slate-950/75 p-2"><Maximize2 size={18} /></button>
    </div>

    <div className="absolute bottom-4 left-1/2 z-10 w-[min(90vw,700px)] -translate-x-1/2 rounded-xl border border-white/30 bg-slate-950/80 px-4 py-2 text-center text-xs font-semibold shadow-lg sm:text-sm">
      {socket.isSpectator || spectatorLevel ? 'Spectator mode — watch the projector for the next stage.' :
        awaitingPipe ? `Question live · ${socket.remainingSeconds}s left · jump onto a pipe to unlock it!` :
        pipeIndex !== null ? questionVisible ? 'Pipe reached · answer the question above.' : 'Pipe reached · wait here for the next live question.' :
        socket.gameState.game_status === 'LOBBY' ? 'Explore the world and find a pipe while the host prepares the quest.' :
        'Move with ← → / A D and jump with Space / ↑ to reach a pipe.'}
    </div>

    {socket.lastError && <div role="alert" className="absolute left-3 top-20 z-40 max-w-sm rounded-lg border border-red-400 bg-red-950 p-3 text-sm">{socket.lastError}<button className="ml-2 underline" onClick={socket.clearError}>Dismiss</button></div>}

    {questionVisible && question && <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="pipe-question" className="max-h-[93vh] w-full max-w-3xl overflow-y-auto rounded-2xl border-4 border-yellow-300 bg-[#15243b] p-4 shadow-[8px_8px_0_#081325] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-600 pb-3"><span className="font-pixel text-xs text-yellow-300">{question.is_practice ? 'PRACTICE PIPE' : question.category === 'SUDDEN_DEATH' ? 'TIE-BREAK PIPE' : `LEVEL ${question.level} · PIPE ${question.sort_order ?? ''}`}</span><span className="rounded-lg border border-yellow-300 bg-black px-3 py-2 font-pixel text-sm text-yellow-200">{socket.remainingSeconds}s</span></div>
        <h2 id="pipe-question" className="mt-4 text-xl font-black leading-snug sm:text-2xl">{question.prompt}</h2>
        {question.is_practice === 1 && <p className="mt-2 text-sm text-sky-200">Warm-up · no quiz coins awarded</p>}
        {socket.gameState.game_status === 'PAUSED' && <p className="mt-3 rounded-lg bg-amber-900 p-2 text-sm">The host paused this question. Your answer options will reopen when play resumes.</p>}
        {(socket.myAnswer || socket.answerPending) && socket.gameState.game_status !== 'REVEAL' && <p className="mt-3 rounded-lg border border-yellow-500 bg-yellow-950 p-2 text-sm">{socket.answerPending ? 'Sending answer…' : `Locked in: option ${socket.myAnswer?.selected_option}`}</p>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{answers.map(([key, value]) => {
          const revealed = socket.gameState.game_status === 'REVEAL';
          const correct = revealed && question.correct_option === key;
          const selected = socket.myAnswer?.selected_option === key;
          return <button key={key} type="button" disabled={!socket.isConnected || !socket.canAnswer || !!socket.myAnswer || socket.answerPending || !questionIsLive} onClick={() => socket.submitAnswer(key)} className={`min-h-14 rounded-xl border-2 p-3 text-left text-sm font-semibold leading-snug transition-colors sm:text-base ${correct ? 'border-green-300 bg-green-700 text-white' : selected ? 'border-yellow-200 bg-yellow-600 text-black' : 'border-slate-500 bg-slate-900 text-white'} disabled:cursor-default`}><span className="mr-2 font-pixel text-xs text-yellow-200">{key}</span>{value}</button>;
        })}</div>
        {socket.gameState.game_status === 'REVEAL' && <div className="mt-4 rounded-xl border-2 border-sky-400 bg-sky-950 p-3 text-sm"><p className="font-bold text-yellow-200">{socket.myAnswer?.is_correct ? question.is_practice ? 'Correct practice answer!' : `Correct! +${socket.myAnswer.coins_awarded ?? 0} coins` : socket.myAnswer ? `The answer is ${question.correct_option}` : `Time is up. The answer is ${question.correct_option}`}</p>{question.explanation && <p className="mt-2 text-slate-100">{question.explanation}</p>}<button onClick={() => setClosedQuestionId(question.id)} className="mt-3 min-h-11 rounded-lg bg-green-700 px-5 font-bold">Continue run →</button></div>}
      </section>
    </div>}

    {stageOverlay && <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/75 p-3 sm:p-5">
      <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-4 border-yellow-300 bg-[#15243b] p-5 text-center shadow-[8px_8px_0_#081325] sm:p-7">
        {podiumStage ? <><h2 className="font-pixel text-lg text-yellow-300">QUEST COMPLETE!</h2><p className="mt-4 text-base">Look at the projector for the verified podium. Thank you for playing.</p></> :
          finalStage ? <><h2 className="font-pixel text-base text-yellow-300">BOWSER'S BOSS CHALLENGE</h2>
            <p className="mt-3 text-sm text-slate-200">{socket.player?.is_qualified_level3 ? 'Present your career decision to the judges when the host calls your name.' : 'The finalists are presenting on stage. Watch the projector.'}</p>
            {socket.player?.is_qualified_level3 && <div className="mt-4 space-y-3 text-left text-sm">
              <div className="rounded-lg border border-red-400 bg-slate-950 p-3"><strong className="text-red-300">OFFER A · ₹45,000/month</strong><p>Early-stage startup; no senior engineering mentor; unclear deliverables.</p></div>
              <div className="rounded-lg border border-green-400 bg-slate-950 p-3"><strong className="text-green-300">OFFER B · ₹18,000/month</strong><p>Established organisation; Staff Engineer mentor; production code ownership and strong PPO history.</p></div>
              <p className="rounded-lg bg-purple-950 p-3 font-semibold">Which offer do you choose, what trade-off do you accept, and what two things do you verify before signing?</p>
              <p className="text-center text-yellow-200">{socket.gameState.speaker_id === playerId ? 'YOUR TURN' : 'Speaker clock'} · {Math.floor(socket.speakerRemainingMs / 60000)}:{String(Math.ceil(socket.speakerRemainingMs / 1000) % 60).padStart(2, '0')}</p>
            </div>}
          </> : <><h2 className="font-pixel text-lg text-yellow-300">SPECTATOR MODE</h2><p className="mt-4 text-base">Level 2 is for the top 50 qualifiers. Your score is saved; follow the next stage on the projector.</p></>}
      </section>
    </div>}

    {locallyPaused && !questionVisible && !stageOverlay && <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/65"><div className="rounded-xl border-4 border-yellow-400 bg-slate-900 p-6 text-center"><h2 className="font-pixel text-yellow-300">MOVEMENT PAUSED</h2><button onClick={togglePause} className="mt-5 min-h-11 rounded-lg bg-green-700 px-6 font-bold">Resume</button></div></div>}
    {levelComplete && !questionVisible && !stageOverlay && <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/65"><div className="rounded-xl border-4 border-yellow-400 bg-slate-900 p-6 text-center"><h2 className="font-pixel text-yellow-300">WORLD CLEARED!</h2><p className="mt-3 text-sm">Your quiz coins are saved. Restart the run to reach another pipe.</p><button onClick={resetRun} className="mt-5 min-h-11 rounded-lg bg-green-700 px-6 font-bold">Restart run</button></div></div>}

    {showTouchControls && !questionVisible && !locallyPaused && !stageOverlay && <div className="pointer-events-none absolute bottom-14 left-0 right-0 z-20 flex items-end justify-between px-3"><div className="pointer-events-auto flex gap-2"><button aria-label="Move left" onPointerDown={() => engineRef.current?.touchLeft(true)} onPointerUp={() => engineRef.current?.touchLeft(false)} onPointerCancel={() => engineRef.current?.touchLeft(false)} className="grid h-16 w-16 place-items-center rounded-xl border-2 border-white/50 bg-slate-950/55 text-3xl">◀</button><button aria-label="Move right" onPointerDown={() => engineRef.current?.touchRight(true)} onPointerUp={() => engineRef.current?.touchRight(false)} onPointerCancel={() => engineRef.current?.touchRight(false)} className="grid h-16 w-16 place-items-center rounded-xl border-2 border-white/50 bg-slate-950/55 text-3xl">▶</button></div><button aria-label="Jump" onPointerDown={() => engineRef.current?.touchJump()} onPointerUp={() => engineRef.current?.touchJumpRelease()} onPointerCancel={() => engineRef.current?.touchJumpRelease()} className="pointer-events-auto grid h-20 w-20 place-items-center rounded-full border-2 border-white/60 bg-red-600/75 text-xs font-pixel">JUMP</button></div>}

    {showRotatePrompt && !questionVisible && <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/95 p-6 text-center"><div><h2 className="font-pixel text-yellow-300">ROTATE YOUR PHONE</h2><p className="mt-4 text-sm">Landscape gives you more room to see the pipes and jump.</p><button onClick={() => setShowRotatePrompt(false)} className="mt-5 min-h-11 rounded-lg bg-red-600 px-6 font-bold">Play anyway</button></div></div>}
  </div>;
};
