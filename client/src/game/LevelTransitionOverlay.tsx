import React, { useEffect, useState } from 'react';
import { Sparkles, Trophy, ArrowRight, Zap } from 'lucide-react';
import { MarioSprite, LuigiSprite } from '../utils/pixelSprites';
import { gameAudio } from './audio';

interface LevelTransitionOverlayProps {
  targetLevel: number;
  playerName?: string;
  avatarId?: string;
  coins?: number;
  message?: string;
  onComplete: () => void;
}

export const LevelTransitionOverlay: React.FC<LevelTransitionOverlayProps> = ({
  targetLevel,
  playerName = 'Player',
  avatarId = 'mario',
  coins = 0,
  message,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'stage_clear' | 'warp_portal' | 'world_intro'>('stage_clear');
  const [progress, setProgress] = useState(0);

  // Retro 8-bit fanfare audio using Web Audio API
  useEffect(() => {
    if (gameAudio.isMuted()) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Classic Mario Stage-Clear Fanfare notes (G4, C5, E5, G5, C6)
      const notes = [
        { freq: 392.00, time: 0.05, dur: 0.12 }, // G4
        { freq: 523.25, time: 0.20, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.35, dur: 0.12 }, // E5
        { freq: 783.99, time: 0.50, dur: 0.18 }, // G5
        { freq: 1046.50, time: 0.72, dur: 0.40 }, // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur + 0.05);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Progression timer: Stage Clear (1.2s) -> Warp Portal (1.2s) -> World Intro (1.2s) -> finish
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('warp_portal'), 1300);
    const t2 = setTimeout(() => setPhase('world_intro'), 2600);
    const t3 = setTimeout(() => onComplete(), 4200);

    const interval = setInterval(() => {
      setProgress(p => Math.min(100, p + (100 / 42)));
    }, 100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, [onComplete]);

  const worldName = targetLevel === 2 ? 'WORLD 2-1: UNDERGROUND ARCHITECT' : 'STAGE 3: BOWSER BOSS ARENA';
  const worldSubtitle = targetLevel === 2
    ? '25 career challenge pillars · Open to every player'
    : 'Live Finalist Presentation on Stage · Executive Rubric Judging';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Level Transition"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
      style={{ touchAction: 'none' }}
    >
      {/* Background radial sunburst / star rays */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400 via-sky-900 to-black animate-pulse" />
      </div>

      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-yellow-300 opacity-60 animate-ping"
            style={{
              width: `${(i % 3) * 6 + 6}px`,
              height: `${(i % 3) * 6 + 6}px`,
              top: `${(i * 19) % 90}%`,
              left: `${(i * 27) % 92}%`,
              animationDuration: `${1.5 + (i % 3) * 0.5}s`,
              animationDelay: `${(i * 0.2)}s`,
            }}
          />
        ))}
      </div>

      {/* Main Transition Card */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl border-4 border-yellow-400 bg-gradient-to-b from-[#182a46] via-[#101c30] to-[#0a1220] p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(250,204,21,0.45)] space-y-5">

        {/* Top Header Badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-pixel text-[11px] tracking-widest bg-yellow-400 text-black font-black uppercase shadow-md">
            <Sparkles size={14} className="animate-spin text-black" />
            {targetLevel === 2 ? 'LEVEL 1 CLEARED' : 'FINALIST SELECTED'}
          </span>
        </div>

        {/* Cinematic Animated Center Content based on Phase */}
        {phase === 'stage_clear' && (
          <div className="space-y-4 animate-bounce">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/20 border-2 border-yellow-400 flex items-center justify-center shadow-lg">
              <Trophy size={48} className="text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h1 className="font-pixel text-2xl sm:text-3xl text-yellow-300 drop-shadow-[0_2px_10px_rgba(250,204,21,0.6)]">
                STAGE CLEAR!
              </h1>
              <p className="font-pixel text-xs text-sky-200 mt-2">
                {targetLevel === 2 ? 'EVERY PLAYER CAN ENTER LEVEL 2' : 'TOP 10 FINALIST'}
              </p>
            </div>
          </div>
        )}

        {phase === 'warp_portal' && (
          <div className="space-y-4 animate-fade-in">
            {/* Animated Mario / Luigi hopping into pipe */}
            <div className="relative w-28 h-28 mx-auto flex items-end justify-center">
              {/* Pipe Graphic */}
              <div className="absolute bottom-0 w-24 h-16 bg-gradient-to-r from-green-600 via-green-400 to-green-700 rounded-t-xl border-4 border-black shadow-lg">
                <div className="w-full h-4 bg-green-500 border-b-2 border-black/40" />
              </div>
              {/* Character sprite jumping down */}
              <div className="relative z-10 mb-8 animate-bounce">
                {avatarId === 'luigi' ? <LuigiSprite size={60} /> : <MarioSprite size={60} />}
              </div>
            </div>
            <div>
              <h2 className="font-pixel text-xl sm:text-2xl text-green-300 drop-shadow-[0_2px_8px_rgba(74,222,128,0.6)]">
                WARP ZONE ACTIVATED!
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Transporting {playerName} to next realm...
              </p>
            </div>
          </div>
        )}

        {phase === 'world_intro' && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center">
              <Zap size={36} className="text-blue-300 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/40">
                NOW ENTERING
              </span>
              <h2 className="font-pixel text-xl sm:text-2xl text-yellow-300 mt-2 leading-tight">
                {worldName}
              </h2>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed px-2">
                {worldSubtitle}
              </p>
            </div>
          </div>
        )}

        {/* Player Stats Bar */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-black/60 rounded-xl border border-yellow-500/30 font-mono text-xs text-left">
          <div>
            <span className="text-slate-400 block text-[10px]">EXPLORER</span>
            <span className="font-bold text-white truncate block">{playerName}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">TOTAL POINTS</span>
            <span className="font-pixel text-yellow-300 text-sm">★ {coins}</span>
          </div>
        </div>

        {message && (
          <p className="text-xs font-semibold text-green-300 bg-green-950/60 p-2 rounded-lg border border-green-500/40">
            {message}
          </p>
        )}

        {/* Progress Bar & Skip Button */}
        <div className="space-y-3 pt-2">
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-yellow-400 to-green-400 h-full transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="w-full min-h-12 rounded-xl bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 hover:brightness-110 active:scale-95 transition-all text-white font-pixel text-xs flex items-center justify-center gap-2 shadow-lg border-2 border-green-300"
          >
            <span>CONTINUE TO {targetLevel === 2 ? 'WORLD 2-1' : 'STAGE 3'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
