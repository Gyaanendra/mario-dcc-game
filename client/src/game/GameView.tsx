import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play, RotateCcw, Volume2, VolumeX, Wifi, WifiOff, Trophy, Sparkles, Search, X, CheckCircle2 } from 'lucide-react';
import { LevelTransitionOverlay } from './LevelTransitionOverlay';
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
  const [closedDemoPipeIndex, setClosedDemoPipeIndex] = useState<number | null>(null);
  const [locallyPaused, setLocallyPaused] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(gameAudio.isMuted());
  const [showTouchControls, setShowTouchControls] = useState(false);
  const avatarId = socket.player?.avatar_id;
  const playerId = socket.player?.id;
  const effectiveLevel = socket.gameState.current_level || 1;
  const isConnected = socket.isConnected;
  const send = socket.send;

  useEffect(() => {
    const checkSize = () => {
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setShowTouchControls(touch || window.innerWidth < 700);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !avatarId) return;
    const engine = new GameEngine(canvasRef.current, avatarId === 'luigi' ? 'luigi' : 'mario', effectiveLevel === 2 ? 2 : 1);
    engineRef.current = engine;
    engine.start();
    const resize = () => engine.resize();
    window.addEventListener('resize', resize);
    let lastContact: number | null = null;
    const poll = window.setInterval(() => {
      const contact = engine.getPipeContact();
      if (contact !== lastContact) {
        lastContact = contact;
        setPipeIndex(contact);
        setSelectedOption(null);
        setImageError(false);
      }
      setLevelComplete(previous => {
        if (!previous && engine.gameState.levelComplete) {
          // Trigger flagpole clear
          send({ type: 'CLIENT_FLAGPOLE_CLEAR' });
        }
        return engine.gameState.levelComplete;
      });
    }, 80);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('resize', resize);
      engine.stop();
      engineRef.current = null;
    };
  }, [avatarId, send, effectiveLevel]);

  useEffect(() => {
    engineRef.current?.setWorldLabel(effectiveLevel || 1);
  }, [effectiveLevel]);

  useEffect(() => {
    engineRef.current?.setFlagpoleEnabled(socket.pipeQuest.totalPipes > 0 &&
      socket.pipeQuest.completedPipes >= socket.pipeQuest.totalPipes);
  }, [socket.pipeQuest.completedPipes, socket.pipeQuest.totalPipes]);

  useEffect(() => {
    if (isConnected && playerId) send({ type: 'CLIENT_PIPE_READY', ready: pipeIndex !== null, pipeIndex });
  }, [pipeIndex, isConnected, playerId, effectiveLevel, send]);

  // Pipe Quest is the active level gameplay
  const isPipeRun = effectiveLevel >= 1;
  const pipeRunQuestion = isPipeRun && pipeIndex !== null && closedDemoPipeIndex !== pipeIndex
    ? socket.pipeQuest.question?.pipeIndex === pipeIndex ? socket.pipeQuest.question
      : socket.pipeQuestResult?.pipeIndex === pipeIndex ? socket.pipeQuestResult.question : null
    : null;
  const isDemoQuestion = !!pipeRunQuestion;
  const question = pipeRunQuestion || socket.activeQuestion;
  const questionVisible = !!question && pipeIndex !== null && !socket.isSpectator &&
    (isDemoQuestion || QUESTION_STATES.includes(socket.gameState.game_status));
  const finalStage = socket.gameState.game_status === 'BOWSER_STAGE';
  const podiumStage = socket.gameState.game_status === 'PODIUM_WINNERS';
  const stageOverlay = finalStage || podiumStage;

  const isHostPaused = socket.gameState.game_status === 'PAUSED';

  useEffect(() => {
    engineRef.current?.setExternalPause(questionVisible || stageOverlay || isHostPaused);
  }, [questionVisible, stageOverlay, isHostPaused]);

  const resetRun = () => {
    engineRef.current?.reset();
    engineRef.current?.setWorldLabel(socket.gameState.current_level || 1);
    setPipeIndex(null);
    setClosedDemoPipeIndex(null);
    setLocallyPaused(false);
    setLevelComplete(false);
    setSelectedOption(null);
    setImageError(false);
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
  const demoResult = isDemoQuestion && socket.pipeQuestResult?.pipeIndex === pipeIndex ? socket.pipeQuestResult : null;
  const totalPipes = socket.pipeQuest.totalPipes || (effectiveLevel === 2 ? 25 : 15);
  const levelScore = effectiveLevel === 2 ? socket.player?.level2_score : socket.player?.level1_score;

  const handleAnswerSubmit = (key: string) => {
    if (isDemoQuestion) {
      socket.submitPipeQuestAnswer(pipeIndex!, question!.id, key);
    } else {
      socket.submitAnswer(key);
    }
  };

  return <div ref={containerRef} className="game-shell fixed inset-0 overflow-hidden bg-sky-700 text-white" style={{ touchAction: questionVisible ? 'pan-y' : 'none' }}>
    <canvas ref={canvasRef} className="game-canvas block h-full w-full" style={{ imageRendering: 'pixelated' }} aria-label="Side-scrolling career quest game world" />

    <header className="game-hud absolute left-2 right-2 top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/30 bg-slate-950/85 px-3 py-2 shadow-lg backdrop-blur-sm sm:left-4 sm:right-4 sm:top-4 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="font-pixel text-[10px] text-yellow-300 sm:text-xs">MARIO QUEST</span>
        <span className="hidden text-sm text-slate-200 sm:inline font-bold">{socket.player?.name}</span>
        <span className="rounded bg-green-700/80 px-2 py-1 text-xs font-bold">WORLD {effectiveLevel === 2 ? '2-1' : '1-1'}</span>
        <span className="rounded bg-sky-800/80 px-2 py-1 text-xs font-bold">PILLARS: {socket.pipeQuest.completedPipes}/{totalPipes}</span>
      </div>
      <div className="flex items-center gap-3 text-xs sm:text-sm">
        <span className="font-bold text-yellow-300 font-pixel text-xs sm:text-sm">★ {levelScore ?? 0} COINS</span>
        <span className={pipeIndex !== null ? 'text-green-300 font-bold' : 'text-white/80'}>{pipeIndex !== null ? `● PILLAR ${pipeIndex + 1}` : '○ FIND NEXT PILLAR'}</span>
        <span title={socket.isConnected ? 'Connected' : 'Reconnecting'}>{socket.isConnected ? <Wifi size={17} className="text-green-300" /> : <WifiOff size={17} className="text-red-300" />}</span>
      </div>
    </header>

    <div className="game-actions absolute right-3 top-20 z-20 flex gap-2 sm:top-20">
      <button onClick={toggleMute} aria-label={isMuted ? 'Unmute game audio' : 'Mute game audio'} className="rounded-lg border border-white/30 bg-slate-950/75 p-2">{isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      <button onClick={togglePause} aria-label={locallyPaused ? 'Resume movement' : 'Pause movement'} className="rounded-lg border border-white/30 bg-slate-950/75 p-2">{locallyPaused ? <Play size={18} /> : <Pause size={18} />}</button>
      <button onClick={resetRun} aria-label="Restart platform run" className="rounded-lg border border-white/30 bg-slate-950/75 p-2"><RotateCcw size={18} /></button>
      <button onClick={toggleFullscreen} aria-label="Toggle fullscreen" className="rounded-lg border border-white/30 bg-slate-950/75 p-2"><Maximize2 size={18} /></button>
    </div>

    <div className="game-caption absolute bottom-4 left-1/2 z-10 w-[min(90vw,700px)] -translate-x-1/2 rounded-xl border border-white/30 bg-slate-950/80 px-4 py-2 text-center text-xs font-semibold shadow-lg sm:text-sm">
      {socket.isSpectator ? 'Spectator mode — watch the projector for the next stage.' :
        awaitingPipe ? `Question live · ${socket.remainingSeconds}s left · jump onto a pillar to unlock it!` :
        isPipeRun && totalPipes > 0 && socket.pipeQuest.completedPipes >= totalPipes ? `All ${totalPipes} pillars solved (${socket.pipeQuest.correctCount}/${totalPipes} correct)! Run right to touch the flagpole and claim the finish bonus!` :
        isPipeRun && pipeIndex !== null && pipeIndex < socket.pipeQuest.nextPipeIndex ? `Pillar ${pipeIndex + 1} cleared · run to Pillar ${socket.pipeQuest.nextPipeIndex + 1}.` :
        isPipeRun && pipeIndex !== null && pipeIndex > socket.pipeQuest.nextPipeIndex ? `Your next unsolved question is at Pillar ${socket.pipeQuest.nextPipeIndex + 1}.` :
        isPipeRun && pipeIndex !== null ? questionVisible ? 'Answer this question to earn coins!' : 'Loading question…' :
        isPipeRun ? `Run to Pillar ${socket.pipeQuest.nextPipeIndex + 1}, jump on top, and answer to earn coins!` :
        pipeIndex !== null ? questionVisible ? 'Pillar reached · answer the question above.' : 'Pillar reached · wait here for question.' :
        'Move with ← → / A D and jump with Space / ↑ to reach a pillar.'}
    </div>

    {socket.lastError && <div role="alert" className="absolute left-3 top-20 z-40 max-w-sm rounded-lg border border-red-400 bg-red-950 p-3 text-sm">{socket.lastError}<button className="ml-2 underline" onClick={socket.clearError}>Dismiss</button></div>}

    {questionVisible && question && (() => {
      const referenceImageUrl = question.image_url || (effectiveLevel === 2 && question.category === 'RESUME_CASE' ? '/images/level2-aditya-resume.png' : null);
      const isAnswerSubmitted = !!demoResult || !!socket.myAnswer;
      const isSubmitting = socket.pipeQuestPending || socket.answerPending;

      return (
        <div className="game-question-overlay absolute inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-2 sm:p-5 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="pipe-question" className="game-question-card max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl border-4 border-yellow-300 bg-[#15243b] p-3.5 sm:p-6 shadow-[8px_8px_0_#081325] animate-fade-in flex flex-col justify-between">
            <div>
              {/* 1. Question Identifier & Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-600 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-pixel text-xs text-yellow-300 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-yellow-400" />
                    WORLD {effectiveLevel === 2 ? '2-1' : '1-1'} · PILLAR {pipeIndex! + 1} OF {totalPipes}
                  </span>
                  {question.category && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/40">
                      {question.category.replaceAll('_', ' ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-yellow-300 bg-black px-2.5 py-1 font-pixel text-xs text-yellow-300">
                    {socket.pipeQuest.completedPipes + 1}/{totalPipes}
                  </span>
                </div>
              </div>

              {/* 2. Question Statement */}
              <h2 id="pipe-question" className="mt-3 text-base sm:text-xl font-black leading-snug sm:leading-normal text-white">
                {question.prompt}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-sky-200">
                <span>★ 100 base coins + speed bonus</span>
                {questionIsLive && socket.remainingSeconds > 0 && (
                  <span className="font-mono text-yellow-300">· ⏱ {socket.remainingSeconds}s</span>
                )}
              </div>

              {/* 3. Reference Image Presentation */}
              {referenceImageUrl && (
                <div className="mt-3 overflow-hidden rounded-xl border border-sky-400/60 bg-slate-900/90 p-2 sm:p-3 text-center">
                  <div className="flex items-center justify-between text-xs text-sky-300 mb-1.5 px-1">
                    <span className="font-semibold flex items-center gap-1.5 font-pixel text-[10px] text-yellow-300">
                      <Search size={13} className="text-yellow-400" />
                      {question.category === 'RESUME_CASE' ? 'ADITYA’S RESUME CASE STUDY' : 'REFERENCE MATERIAL / DIAGRAM'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomedImage(referenceImageUrl)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:text-white bg-sky-950/80 px-2 py-0.5 rounded border border-sky-400/40 cursor-pointer"
                    >
                      <Search size={12} /> Tap to zoom
                    </button>
                  </div>
                  {imageError ? (
                    <div className="p-4 bg-slate-950 rounded-lg text-slate-400 text-xs border border-slate-700">
                      ⚠️ Reference image could not be loaded. Please refer to question text.
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Click to enlarge reference image"
                      onClick={() => setZoomedImage(referenceImageUrl)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setZoomedImage(referenceImageUrl); }}
                      className="group relative flex items-center justify-center bg-black/60 rounded-lg overflow-hidden border border-slate-700/80 cursor-pointer max-h-48 sm:max-h-64"
                    >
                      <img
                        src={referenceImageUrl}
                        alt="Case Study Reference Material"
                        loading="eager"
                        decoding="async"
                        onError={() => setImageError(true)}
                        className="max-h-48 sm:max-h-64 w-auto max-w-full object-contain mx-auto rounded transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-slate-950/90 text-yellow-300 font-pixel text-[10px] px-3 py-1.5 rounded-lg border border-yellow-400/50 shadow-lg flex items-center gap-1.5">
                          <Search size={14} /> TAP TO ZOOM FULLSCREEN
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 text-center">
                    Tap diagram or "Tap to zoom" to inspect full resolution
                  </p>
                </div>
              )}

              {/* 4. Answer Options */}
              {isDemoQuestion && socket.pipeQuestPending && (
                <p className="mt-3 rounded-lg border border-yellow-500 bg-yellow-950 p-2 text-sm text-yellow-200 animate-pulse">
                  Checking answer…
                </p>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {answers.map(([key, value]) => {
                  const revealed = isDemoQuestion ? !!demoResult : socket.gameState.game_status === 'REVEAL';
                  const correct = revealed && question.correct_option === key;
                  const isSubmitted = (isDemoQuestion ? demoResult?.selectedOption : socket.myAnswer?.selected_option) === key;
                  const isCurrentlySelected = selectedOption === key;
                  const disabled = !socket.isConnected || (isDemoQuestion ? !!demoResult || socket.pipeQuestPending : !socket.canAnswer || !!socket.myAnswer || socket.answerPending);

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        if (selectedOption === key) {
                          handleAnswerSubmit(key);
                        } else {
                          setSelectedOption(key);
                        }
                      }}
                      className={`min-h-12 sm:min-h-14 rounded-xl border-2 p-2.5 sm:p-3 text-left text-xs sm:text-sm font-semibold leading-snug transition-all ${
                        correct
                          ? 'border-green-300 bg-green-700 text-white shadow-lg ring-2 ring-green-300'
                          : isSubmitted
                          ? 'border-yellow-200 bg-yellow-600 text-black shadow-lg ring-2 ring-yellow-300'
                          : isCurrentlySelected
                          ? 'border-yellow-300 bg-yellow-500/25 text-yellow-200 ring-2 ring-yellow-400 shadow-md'
                          : 'border-slate-500 bg-slate-900 text-white hover:border-yellow-400 active:scale-[0.99]'
                      } disabled:cursor-default`}
                    >
                      <span className={`mr-2 font-pixel text-xs ${isCurrentlySelected ? 'text-yellow-300 font-bold' : 'text-yellow-200'}`}>
                        {key}
                      </span>
                      {value}
                    </button>
                  );
                })}
              </div>

              {/* 5. Submit Button */}
              {!isAnswerSubmitted && (
                <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-950/80 p-2.5 sm:p-3 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-300 font-mono text-center sm:text-left">
                    {selectedOption ? `Selected: Option ${selectedOption}` : 'Tap an option above to select'}
                  </span>
                  <button
                    type="button"
                    disabled={!selectedOption || !socket.isConnected || isSubmitting}
                    onClick={() => { if (selectedOption) handleAnswerSubmit(selectedOption); }}
                    className="w-full sm:w-auto min-h-11 px-5 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:brightness-110 active:scale-95 transition-all text-black font-pixel text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={15} />
                    <span>{isSubmitting ? 'CHECKING…' : selectedOption ? `SUBMIT OPTION ${selectedOption} ▶` : 'CHOOSE AN OPTION'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 6. Post-Answer Feedback Card */}
            {demoResult && (
              <div className={`mt-3 rounded-xl border-2 p-3 sm:p-4 text-xs sm:text-sm animate-fade-in ${demoResult.isCorrect ? 'border-green-400 bg-green-950/85' : 'border-red-400 bg-red-950/85'}`}>
                <p className="font-bold text-sm sm:text-base text-yellow-300">
                  {demoResult.isCorrect ? `★ CORRECT! +${(demoResult as any).coinsAwarded || 100} Coins Awarded!` : `INCORRECT. The correct answer was option ${question.correct_option}.`}
                </p>
                {question.explanation && (
                  <p className="mt-1.5 text-slate-100 text-xs sm:text-sm leading-relaxed">{question.explanation}</p>
                )}
                <button
                  type="button"
                  onClick={() => { setClosedDemoPipeIndex(pipeIndex); socket.clearPipeQuestResult(); }}
                  className="mt-3 min-h-11 w-full rounded-lg bg-green-600 hover:bg-green-500 font-pixel text-xs text-white shadow-md active:scale-98 transition-all"
                >
                  {pipeIndex! + 1 >= totalPipes ? 'ALL PILLARS CLEARED! RUN TO FLAGPOLE 🚩' : `CONTINUE TO PILLAR ${pipeIndex! + 2} ▶`}
                </button>
              </div>
            )}
          </section>
        </div>
      );
    })()}

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
          </> : null}
      </section>
    </div>}

    {isHostPaused && !stageOverlay && (
      <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
        <div className="rounded-2xl border-4 border-yellow-400 bg-slate-900 p-8 text-center max-w-sm w-full space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-yellow-500/20 text-yellow-300 grid place-items-center mx-auto text-2xl font-bold border border-yellow-400/50">
            ⏸️
          </div>
          <h2 className="font-pixel text-lg text-yellow-300">GAME PAUSED BY HOST</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            The event operator has temporarily paused the game. Please stand by on this screen; it will resume automatically.
          </p>
        </div>
      </div>
    )}

    {locallyPaused && !questionVisible && !stageOverlay && !isHostPaused && <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/65"><div className="rounded-xl border-4 border-yellow-400 bg-slate-900 p-6 text-center"><h2 className="font-pixel text-yellow-300">MOVEMENT PAUSED</h2><button onClick={togglePause} className="mt-5 min-h-11 rounded-lg bg-green-700 px-6 font-bold">Resume</button></div></div>}
    
    {levelComplete && !questionVisible && !stageOverlay && (
      <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/75 p-4 animate-fade-in">
        <div className="rounded-2xl border-4 border-yellow-400 bg-slate-900 p-6 text-center max-w-md w-full shadow-2xl space-y-4">
          <Trophy size={48} className="text-yellow-400 mx-auto animate-bounce" />
          <h2 className="font-pixel text-xl text-yellow-300">WORLD {effectiveLevel === 2 ? '2-1' : '1-1'} CLEARED!</h2>
          <p className="text-sm text-green-300 font-bold">★ FLAGPOLE REACHED · FINISH BONUS CLAIMED!</p>
          <p className="text-xs text-slate-300">
            You completed Level {effectiveLevel}! Look up at the projector to see your live ranking {effectiveLevel === 2 ? 'for the top 10 final' : 'and get ready for Level 2, which everyone can play'}.
          </p>
          <div className="p-3 bg-black/60 rounded-xl border border-yellow-500/40 font-mono text-sm">
            Level {effectiveLevel} Coins: <span className="text-yellow-300 font-bold text-lg font-pixel">{levelScore ?? 0}</span>
          </div>
          <button onClick={resetRun} className="min-h-12 w-full rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm">
            Re-run level for fun
          </button>
        </div>
      </div>
    )}

    {showTouchControls && !questionVisible && !locallyPaused && !stageOverlay && <div className="game-controls pointer-events-none absolute bottom-14 left-0 right-0 z-20 flex items-end justify-between px-3"><span className="game-controls-label">HOLD TO RUN · TAP TO JUMP</span><div className="pointer-events-auto flex gap-3"><button aria-label="Move left" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); engineRef.current?.touchLeft(true); }} onPointerUp={() => engineRef.current?.touchLeft(false)} onPointerCancel={() => engineRef.current?.touchLeft(false)} onLostPointerCapture={() => engineRef.current?.touchLeft(false)} className="game-control-btn grid h-16 w-16 place-items-center rounded-xl border-2 border-white/50 bg-slate-950/75 text-3xl">◀</button><button aria-label="Move right" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); engineRef.current?.touchRight(true); }} onPointerUp={() => engineRef.current?.touchRight(false)} onPointerCancel={() => engineRef.current?.touchRight(false)} onLostPointerCapture={() => engineRef.current?.touchRight(false)} className="game-control-btn grid h-16 w-16 place-items-center rounded-xl border-2 border-white/50 bg-slate-950/75 text-3xl">▶</button></div><button aria-label="Jump" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); engineRef.current?.touchJump(); }} onPointerUp={() => engineRef.current?.touchJumpRelease()} onPointerCancel={() => engineRef.current?.touchJumpRelease()} onLostPointerCapture={() => engineRef.current?.touchJumpRelease()} className="game-jump-btn pointer-events-auto grid h-20 w-20 place-items-center rounded-full border-2 border-white/60 bg-red-600 text-xs font-pixel">JUMP</button></div>}

    {/* Lightbox Zoom Modal for Diagrams */}
    {zoomedImage && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-5 backdrop-blur-md animate-fade-in"
        onClick={() => setZoomedImage(null)}
      >
        <div
          className="relative max-w-5xl w-full max-h-[95vh] flex flex-col bg-[#15243b] border-2 border-yellow-400 rounded-2xl p-3 sm:p-4 shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between w-full border-b border-slate-700 pb-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-xs text-yellow-300">FULL REFERENCE VIEW</span>
              <span className="text-xs text-slate-400 hidden sm:inline">• Pinch or scroll to inspect details</span>
            </div>
            <button
              onClick={() => setZoomedImage(null)}
              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1 text-xs px-2.5"
              aria-label="Close zoomed image"
            >
              <X size={16} /> Close
            </button>
          </div>
          <div className="overflow-auto w-full p-2 flex items-center justify-center max-h-[80vh] bg-black/40 rounded-lg mt-2">
            <img
              src={zoomedImage}
              alt="Expanded reference diagram"
              className="max-h-[78vh] w-auto max-w-full object-contain rounded"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 px-1">
            <span>Touch or click Close (✕) to return</span>
            <a
              href={zoomedImage}
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 underline font-semibold hover:text-white"
            >
              Open full image in new tab ↗
            </a>
          </div>
        </div>
      </div>
    )}

    {/* Smooth Cinematic Level Transition Overlay */}
    {socket.levelAdvanceEvent && (
      <LevelTransitionOverlay
        targetLevel={socket.levelAdvanceEvent.targetLevel}
        playerName={socket.player?.name}
        avatarId={avatarId}
        coins={(socket.player?.level1_score || 0) + (socket.player?.level2_score || 0)}
        message={socket.levelAdvanceEvent.message}
        onComplete={socket.clearLevelAdvance}
      />
    )}
  </div>;
};
