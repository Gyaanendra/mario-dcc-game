import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './engine';
import { gameAudio } from './audio';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Maximize2 } from 'lucide-react';
import { useGameSocket } from '../utils/socket';

interface PillarQuestion {
  id: number;
  pillarId: number;
  prompt: string;
  options: { key: string; text: string }[];
  correctOption: string;
  category: string;
}

const PLACEHOLDER_QUESTIONS: PillarQuestion[] = [
  {
    id: 101, pillarId: 1, category: 'CAREER BASICS',
    prompt: 'What is the most important factor when choosing your first job after graduation?',
    options: [
      { key: 'A', text: 'Highest salary offered' },
      { key: 'B', text: 'Learning opportunities and growth' },
      { key: 'C', text: 'Brand name of the company' },
      { key: 'D', text: 'Office location convenience' },
    ],
    correctOption: 'B',
  },
  {
    id: 102, pillarId: 2, category: 'PLACEMENT TERMS',
    prompt: 'What does "CTC" stand for in a job offer letter?',
    options: [
      { key: 'A', text: 'Cost To Company' },
      { key: 'B', text: 'Company Training Certificate' },
      { key: 'C', text: 'Career Transition Course' },
      { key: 'D', text: 'Central Talent Committee' },
    ],
    correctOption: 'A',
  },
  {
    id: 103, pillarId: 3, category: 'RESUME',
    prompt: 'Which section should appear first on a fresher\'s resume?',
    options: [
      { key: 'A', text: 'Work experience' },
      { key: 'B', text: 'Hobbies and interests' },
      { key: 'C', text: 'Education and skills' },
      { key: 'D', text: 'References' },
    ],
    correctOption: 'C',
  },
];

function getQuestionForPillar(pillarId: number): PillarQuestion {
  return PLACEHOLDER_QUESTIONS.find(q => q.pillarId === pillarId) || PLACEHOLDER_QUESTIONS[0];
}

export const GameView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(gameAudio.isMuted());
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [, setIsFullscreen] = useState(false);

  const [activePillarId, setActivePillarId] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const { player, submitPillarAnswer } = useGameSocket('PLAYER');

  const checkMobile = useCallback(() => {
    const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobile(mobile);
  }, []);

  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [checkMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.start();

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);
    handleResize();

    const statusCheck = setInterval(() => {
      const gs = engine.gameState;
      if (!gs) return;
      setIsPaused(gs.paused);
      setIsGameOver(gs.gameOver);
      setIsLevelComplete(gs.levelComplete);

      const pillarId = engine.getActivePillarId();
      if (pillarId && !activePillarId) {
        setActivePillarId(pillarId);
        setSelectedAnswer(null);
        setAnswerSubmitted(false);
        setShowResult(false);
      }
    }, 100);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
      clearInterval(statusCheck);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMute = () => {
    setIsMuted(gameAudio.toggleMute());
  };

  const handlePause = () => {
    engineRef.current?.togglePause();
    setIsPaused(p => !p);
  };

  const handleReset = () => {
    engineRef.current?.reset();
    setIsGameOver(false);
    setIsLevelComplete(false);
    setIsPaused(false);
    setActivePillarId(null);
  };

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleTouchLeft = (active: boolean) => engineRef.current?.touchLeft(active);
  const handleTouchRight = (active: boolean) => engineRef.current?.touchRight(active);
  const handleTouchJump = () => engineRef.current?.touchJump();
  const handleTouchJumpEnd = () => engineRef.current?.touchJumpRelease();

  const preventTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !activePillarId || answerSubmitted) return;
    const question = getQuestionForPillar(activePillarId);
    const isCorrect = selectedAnswer === question.correctOption;
    setAnswerSubmitted(true);
    setShowResult(true);

    if (player) {
      submitPillarAnswer(activePillarId, question.id, selectedAnswer, isCorrect);
    }

    setTimeout(() => {
      engineRef.current?.markPillarAnswered(activePillarId);
      setActivePillarId(null);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
      setShowResult(false);
    }, 2000);
  };

  const questionCardActive = activePillarId !== null;
  const currentQuestion = activePillarId ? getQuestionForPillar(activePillarId) : null;

  const canvasHeight = isMobile ? '60vh' : '100%';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden select-none flex flex-col"
      style={{ touchAction: 'none' }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Game Canvas */}
      <div className="relative flex-1" style={{ height: isMobile ? canvasHeight : '100%' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ imageRendering: 'pixelated' }}
          onTouchStart={preventTouch}
          onTouchMove={preventTouch}
        />

        {/* Top-right controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
          <button
            onClick={handleToggleMute}
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg border border-white/20 text-white/80 backdrop-blur-sm"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={handlePause}
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg border border-white/20 text-white/80 backdrop-blur-sm"
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            onClick={handleFullscreen}
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg border border-white/20 text-white/80 backdrop-blur-sm"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Dev nav back button */}
        {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
          <button
            onClick={() => { window.history.pushState({}, '', '/'); window.location.reload(); }}
            className="absolute top-2 left-2 z-20 px-2 py-1 bg-black/60 hover:bg-black/80 rounded-lg border border-white/20 text-white/60 text-[10px] font-mono backdrop-blur-sm"
          >
            Back
          </button>
        )}
      </div>

      {/* Mobile Touch Controls — below canvas in portrait */}
      {isMobile && !isPaused && !isGameOver && !isLevelComplete && !questionCardActive && (
        <div className="relative bg-[#0a0e1a] flex items-center justify-between px-4 py-3" style={{ height: '40vh' }}>
          {/* Left: Movement arrows */}
          <div className="flex items-center gap-3">
            <button
              className="w-[72px] h-[72px] rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center active:bg-white/25"
              onTouchStart={(e) => { preventTouch(e); handleTouchLeft(true); }}
              onTouchEnd={(e) => { preventTouch(e); handleTouchLeft(false); }}
              onTouchCancel={(e) => { preventTouch(e); handleTouchLeft(false); }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
              </svg>
            </button>
            <button
              className="w-[72px] h-[72px] rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center active:bg-white/25"
              onTouchStart={(e) => { preventTouch(e); handleTouchRight(true); }}
              onTouchEnd={(e) => { preventTouch(e); handleTouchRight(false); }}
              onTouchCancel={(e) => { preventTouch(e); handleTouchRight(false); }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
              </svg>
            </button>
          </div>

          {/* Right: Crimson jump button */}
          <button
            className="w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #ff4444, #dc143c 50%, #8b0000)',
              boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.2), 0 4px 12px rgba(220,20,60,0.4)',
              border: '3px solid rgba(255,100,100,0.3)',
            }}
            onTouchStart={(e) => { preventTouch(e); handleTouchJump(); }}
            onTouchEnd={(e) => { preventTouch(e); handleTouchJumpEnd(); }}
            onTouchCancel={(e) => { preventTouch(e); handleTouchJumpEnd(); }}
          >
            <span className="font-pixel text-white text-xs select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              JUMP
            </span>
          </button>
        </div>
      )}

      {/* Desktop mobile controls as overlay when not mobile */}
      {!isMobile && false /* Desktop uses keyboard only */}

      {/* Pause Overlay (only show when manually paused, not pillar-paused) */}
      {isPaused && !isGameOver && !isLevelComplete && !questionCardActive && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
          <div className="bg-[#171B30] border-4 border-yellow-500 rounded-2xl p-8 text-center shadow-2xl max-w-sm">
            <h2 className="font-pixel text-2xl text-yellow-400 mb-4">PAUSED</h2>
            <div className="space-y-3">
              <button
                onClick={handlePause}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-pixel text-sm rounded-xl border-2 border-black"
              >
                RESUME
              </button>
              <button
                onClick={handleReset}
                className="w-full py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-pixel text-sm rounded-xl border-2 border-black flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                RESTART LEVEL
              </button>
            </div>
            <div className="mt-4 text-xs text-zinc-400 font-mono">
              <div>Arrow Keys / WASD: Move</div>
              <div>Space / W / Up: Jump</div>
              <div>ESC: Pause</div>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
          <div className="bg-[#171B30] border-4 border-red-500 rounded-2xl p-8 text-center shadow-2xl max-w-sm">
            <h2 className="font-pixel text-3xl text-red-500 mb-2">GAME OVER</h2>
            <p className="text-sm text-zinc-400 font-mono mb-6">Better luck next time!</p>
            <button
              onClick={handleReset}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-pixel text-sm rounded-xl border-2 border-black flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              TRY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Level Complete Overlay */}
      {isLevelComplete && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-30">
          <div className="bg-[#171B30] border-4 border-yellow-400 rounded-2xl p-8 text-center shadow-2xl max-w-sm">
            <h2 className="font-pixel text-2xl text-yellow-400 mb-2">LEVEL COMPLETE!</h2>
            <p className="text-sm text-green-400 font-pixel mb-6">CONGRATULATIONS!</p>
            <button
              onClick={handleReset}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-pixel text-sm rounded-xl border-2 border-black"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Question Card Overlay */}
      {questionCardActive && currentQuestion && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 p-4 backdrop-blur-sm">
          <div className="bg-[#171B30] border-4 border-yellow-500 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-lg text-white" style={{ textShadow: '1px 1px 0 #b45309' }}>?</span>
                <span className="font-pixel text-xs text-white" style={{ textShadow: '1px 1px 0 #b45309' }}>
                  PILLAR {activePillarId}
                </span>
              </div>
              <span className="text-[10px] font-mono text-yellow-900 bg-yellow-200/50 px-2 py-0.5 rounded">
                {currentQuestion.category}
              </span>
            </div>

            {/* Question */}
            <div className="px-5 pt-4 pb-3">
              <p className="text-sm font-semibold text-zinc-100 leading-relaxed">
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Options */}
            <div className="px-5 pb-3 space-y-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedAnswer === opt.key;
                const isCorrect = showResult && opt.key === currentQuestion.correctOption;
                const isWrong = showResult && isSelected && opt.key !== currentQuestion.correctOption;

                let style = 'border-zinc-600 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60';
                if (isSelected && !showResult) {
                  style = 'border-yellow-400 bg-yellow-500/20 text-yellow-200 ring-2 ring-yellow-400/50';
                }
                if (isCorrect) {
                  style = 'border-green-400 bg-green-600/30 text-green-200 ring-2 ring-green-400';
                }
                if (isWrong) {
                  style = 'border-red-500 bg-red-900/30 text-red-300 opacity-70';
                }

                return (
                  <button
                    key={opt.key}
                    disabled={answerSubmitted}
                    onClick={() => !answerSubmitted && setSelectedAnswer(opt.key)}
                    className={`w-full p-3 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${style} disabled:cursor-not-allowed`}
                  >
                    <span className="font-pixel text-xs px-2 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
                      {opt.key}
                    </span>
                    <span className="text-xs leading-tight pt-0.5">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Result message */}
            {showResult && (
              <div className={`mx-5 mb-3 p-2.5 rounded-lg text-center font-pixel text-xs ${
                selectedAnswer === currentQuestion.correctOption
                  ? 'bg-green-900/40 border border-green-500 text-green-300'
                  : 'bg-red-900/40 border border-red-500 text-red-300'
              }`}>
                {selectedAnswer === currentQuestion.correctOption ? 'CORRECT!' : `ANSWER: ${currentQuestion.correctOption}`}
              </div>
            )}

            {/* Submit Button */}
            <div className="px-5 pb-5">
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer || answerSubmitted}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-white font-pixel text-sm rounded-xl border-2 border-black transition-all active:scale-95"
              >
                {answerSubmitted ? 'SUBMITTED' : 'SUBMIT ANSWER'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
