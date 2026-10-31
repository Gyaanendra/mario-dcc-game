import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './engine';
import { gameAudio } from './audio';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Maximize2 } from 'lucide-react';

export const GameView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(gameAudio.isMuted());
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [showLandscapePrompt, setShowLandscapePrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [, setIsFullscreen] = useState(false);

  const checkMobile = useCallback(() => {
    const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobile(mobile);
    if (mobile && window.innerHeight > window.innerWidth) {
      setShowLandscapePrompt(true);
    } else {
      setShowLandscapePrompt(false);
    }
  }, []);

  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    const handleOrientation = () => {
      setTimeout(checkMobile, 100);
    };
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [checkMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.start();

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const statusCheck = setInterval(() => {
      if (engine.gameState.paused !== isPaused) setIsPaused(engine.gameState.paused);
      if (engine.gameState.gameOver !== isGameOver) setIsGameOver(engine.gameState.gameOver);
      if (engine.gameState.levelComplete !== isLevelComplete) setIsLevelComplete(engine.gameState.levelComplete);
    }, 100);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
      clearInterval(statusCheck);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMute = () => {
    const m = gameAudio.toggleMute();
    setIsMuted(m);
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

  // Touch input handlers
  const handleTouchLeft = (active: boolean) => {
    engineRef.current?.touchLeft(active);
  };
  const handleTouchRight = (active: boolean) => {
    engineRef.current?.touchRight(active);
  };
  const handleTouchJump = () => {
    engineRef.current?.touchJump();
  };
  const handleTouchJumpEnd = () => {
    engineRef.current?.touchJumpRelease();
  };

  // Prevent default on touch to avoid scrolling
  const preventTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (showLandscapePrompt) {
    return (
      <div className="fixed inset-0 bg-[#0D101D] flex flex-col items-center justify-center z-50 p-8 text-center">
        <div className="text-6xl mb-6 animate-bounce">📱</div>
        <h2 className="font-pixel text-lg text-yellow-400 mb-3">ROTATE YOUR DEVICE</h2>
        <p className="text-sm text-zinc-300 font-mono max-w-xs">
          Mario Career Quest plays best in landscape mode. Please rotate your phone sideways!
        </p>
        <button
          onClick={() => setShowLandscapePrompt(false)}
          className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-pixel text-xs rounded-xl border-2 border-black"
        >
          PLAY ANYWAY
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden select-none"
      style={{ touchAction: 'none' }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ imageRendering: 'pixelated' }}
        onTouchStart={preventTouch}
        onTouchMove={preventTouch}
      />

      {/* Top-right controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        <button
          onClick={handleToggleMute}
          className="p-2 bg-black/60 hover:bg-black/80 rounded-lg border border-white/20 text-white/80 backdrop-blur-sm transition-colors"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button
          onClick={handlePause}
          className="p-2 bg-black/60 hover:bg-black/80 rounded-lg border border-white/20 text-white/80 backdrop-blur-sm transition-colors"
        >
          {isPaused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        <button
          onClick={handleFullscreen}
          className="p-2 bg-black/60 hover:bg-black/80 rounded-lg border border-white/20 text-white/80 backdrop-blur-sm transition-colors"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Pause Overlay */}
      {isPaused && !isGameOver && !isLevelComplete && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
          <div className="bg-[#171B30] border-4 border-yellow-500 rounded-2xl p-8 text-center shadow-2xl max-w-sm">
            <h2 className="font-pixel text-2xl text-yellow-400 mb-4">PAUSED</h2>
            <div className="space-y-3">
              <button
                onClick={handlePause}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-pixel text-sm rounded-xl border-2 border-black transition-colors"
              >
                RESUME
              </button>
              <button
                onClick={handleReset}
                className="w-full py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-pixel text-sm rounded-xl border-2 border-black transition-colors flex items-center justify-center gap-2"
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
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-pixel text-sm rounded-xl border-2 border-black transition-colors flex items-center justify-center gap-2"
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
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-pixel text-sm rounded-xl border-2 border-black transition-colors"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Mobile Touch Controls */}
      {isMobile && !isPaused && !isGameOver && !isLevelComplete && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ height: '40%' }}>
          {/* D-Pad Left Side */}
          <div className="absolute left-3 bottom-4 pointer-events-auto flex items-center gap-1">
            <button
              className="w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/25 flex items-center justify-center active:bg-white/30 backdrop-blur-sm"
              onTouchStart={(e) => { preventTouch(e); handleTouchLeft(true); }}
              onTouchEnd={(e) => { preventTouch(e); handleTouchLeft(false); }}
              onTouchCancel={(e) => { preventTouch(e); handleTouchLeft(false); }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white" opacity="0.8">
                <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className="w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/25 flex items-center justify-center active:bg-white/30 backdrop-blur-sm"
              onTouchStart={(e) => { preventTouch(e); handleTouchRight(true); }}
              onTouchEnd={(e) => { preventTouch(e); handleTouchRight(false); }}
              onTouchCancel={(e) => { preventTouch(e); handleTouchRight(false); }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white" opacity="0.8">
                <path d="M9 5l7 7-7 7" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Jump Button Right Side */}
          <div className="absolute right-3 bottom-4 pointer-events-auto">
            <button
              className="w-24 h-24 rounded-full bg-red-600/50 border-3 border-red-400/60 flex items-center justify-center active:bg-red-500/70 backdrop-blur-sm"
              onTouchStart={(e) => { preventTouch(e); handleTouchJump(); }}
              onTouchEnd={(e) => { preventTouch(e); handleTouchJumpEnd(); }}
              onTouchCancel={(e) => { preventTouch(e); handleTouchJumpEnd(); }}
            >
              <span className="font-pixel text-white/80 text-sm select-none">JUMP</span>
            </button>
          </div>
        </div>
      )}

      {/* Dev nav back button */}
      {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
        <button
          onClick={() => { window.history.pushState({}, '', '/'); window.location.reload(); }}
          className="absolute top-3 left-3 z-20 px-3 py-1.5 bg-black/60 hover:bg-black/80 rounded-lg border border-white/20 text-white/60 text-xs font-mono backdrop-blur-sm"
        >
          ← Back
        </button>
      )}
    </div>
  );
};
