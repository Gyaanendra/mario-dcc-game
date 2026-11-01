import React, { Suspense, lazy, useState } from 'react';
import { useGameSocket } from '../utils/socket';
import { LuigiSprite, MarioSprite } from '../utils/pixelSprites';
import { Clock, Sparkles } from 'lucide-react';

const GameView = lazy(() => import('../game/GameView').then(module => ({ default: module.GameView })));

export const PlayerView: React.FC = () => {
  const socket = useGameSocket('PLAYER');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState<'mario' | 'luigi'>('mario');
  const [recoveryInput, setRecoveryInput] = useState('');

  if (socket.isReconnecting) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#0d2039] text-white p-6 text-center">
        <div>
          <h1 className="font-pixel text-yellow-300 mb-4">RESTORING YOUR QUEST</h1>
          <p>Your player and points are being restored…</p>
        </div>
      </main>
    );
  }

  // Once player has joined:
  if (socket.player) {
    // 1. IN THE LOBBY: Players wait for host to start Level 1 (DO NOT start the 2D runner yet!)
    if (socket.gameState.game_status === 'LOBBY') {
      return (
        <main className="relative min-h-screen overflow-hidden bg-sky-900 text-white flex flex-col justify-between">
          <div className="absolute inset-0 bg-[url('/images/dcc-platform-world-clean.png')] bg-cover bg-center opacity-30" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-950/70 via-sky-900/60 to-slate-950/90" aria-hidden="true" />

          {/* Top Bar */}
          <header className="relative z-10 px-4 py-3 border-b border-white/20 bg-black/50 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              {socket.player.avatar_id === 'luigi' ? <LuigiSprite size={30} /> : <MarioSprite size={30} />}
              <div>
                <p className="font-pixel text-[9px] text-yellow-400">BENNETT UNIVERSITY · SCSET</p>
                <p className="font-pixel text-xs text-white">MARIO CAREER QUEST</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-green-950/80 border border-green-400 text-xs text-green-300 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
              REGISTERED & READY
            </div>
          </header>

          {/* Center Waiting Room Card */}
          <div className="relative z-10 max-w-lg mx-auto w-full p-4 space-y-4 text-center my-auto">
            <div className="bg-[#15243b]/95 border-4 border-yellow-400 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-sky-950/90 rounded-2xl border-2 border-yellow-300 shadow-inner">
                  {socket.player.avatar_id === 'luigi' ? <LuigiSprite size={70} /> : <MarioSprite size={70} />}
                </div>
              </div>

              <div>
                <span className="px-3 py-1 rounded bg-yellow-500/20 text-yellow-300 font-pixel text-[10px] tracking-widest border border-yellow-400/40">EXPLORER PROFILE</span>
                <h1 className="text-2xl font-black font-pixel text-yellow-300 mt-2">{socket.player.name}</h1>
                <p className="font-mono text-sm text-sky-200 font-bold">ROLL: {socket.player.student_id}</p>
              </div>

              {/* Waiting Status Box */}
              <div className="p-4 bg-yellow-500/15 border-2 border-yellow-400/80 rounded-xl space-y-2">
                <div className="flex items-center justify-center gap-2 text-yellow-300 font-pixel text-xs animate-pulse">
                  <Clock size={16} />
                  <span>WAITING FOR HOST TO START LEVEL 1</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Keep this tab open! Once the host starts Level 1 on the stage, World 1-1 will automatically launch on your screen.
                </p>
              </div>

              {/* Instructions */}
              <div className="text-left bg-black/50 border border-slate-700 rounded-xl p-4 space-y-2.5 text-xs text-slate-200">
                <div className="font-pixel text-[11px] text-yellow-300 mb-1 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-400" /> HOW LEVEL 1 WORKS:
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-pixel text-yellow-400 text-[10px]">1.</span>
                  <p><strong>Run & Jump:</strong> Use arrow keys / Space on keyboard, or on-screen buttons on phone.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-pixel text-yellow-400 text-[10px]">2.</span>
                  <p><strong>10 Pillars / Pipes:</strong> Run to each pillar and jump on top to unlock a career quiz question.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-pixel text-yellow-400 text-[10px]">3.</span>
                  <p><strong>100 Coins + Speed Bonus:</strong> Answer quickly to earn up to 50 bonus speed coins per question!</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-pixel text-yellow-400 text-[10px]">4.</span>
                  <p><strong>Flagpole Finish:</strong> Clear all 10 pillars and grab the flagpole for a big finish bonus! Top 50 advance.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="relative z-10 p-3 text-center text-xs text-slate-400 border-t border-white/10 bg-black/50">
            Dean Career Cloud · SCSET · Bennett University
          </footer>
        </main>
      );
    }

    // 2. WHEN HOST STARTS LEVEL 1 OR 2: Launch the 2D Mario Platformer!
    return (
      <Suspense fallback={<div className="min-h-screen grid place-items-center bg-sky-800 text-white font-pixel">LOADING QUEST…</div>}>
        <GameView key={socket.gameState.current_level >= 2 ? socket.gameState.current_level : 1} socket={socket} />
      </Suspense>
    );
  }

  // 3. Registration View (if player not joined yet)
  return (
    <main className="relative min-h-screen overflow-hidden bg-sky-700 text-white">
      <div className="absolute inset-0 bg-[url('/images/dcc-platform-world-clean.png')] bg-cover bg-center" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-950/40 via-sky-950/25 to-slate-950/80" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-7 p-4 md:flex-row md:gap-12 md:p-8">
        <div className="w-full max-w-lg text-center md:text-left">
          <p className="inline-block rounded-full border border-white/40 bg-sky-950/75 px-4 py-2 text-xs font-bold tracking-widest">BENNETT UNIVERSITY · DEAN CAREER CLOUD</p>
          <h1 className="mt-6 font-pixel text-3xl leading-normal text-yellow-300 drop-shadow-[4px_5px_0_#17345c] md:text-5xl">MARIO<br />CAREER QUEST</h1>
          <p className="mt-5 text-lg font-semibold text-white drop-shadow-md">Run, jump onto pillars, solve career challenges, and level up!</p>
          <p className="mt-3 text-sm text-white/90">Join the arena on your phone or laptop. Fast and accurate answers earn coins. Top 50 advance to Level 2.</p>
        </div>
        <div className="w-full max-w-md rounded-2xl border-4 border-black bg-[#15243b]/95 p-5 shadow-[8px_8px_0_#0d1727] sm:p-7">
          <h2 className="font-pixel text-sm text-yellow-300">ENTER THE QUEST</h2>
          <div className="mt-5 flex gap-3" role="group" aria-label="Choose explorer">
            {(['mario', 'luigi'] as const).map(id => (
              <button key={id} type="button" aria-pressed={avatarId === id} onClick={() => setAvatarId(id)} className={`flex min-h-20 flex-1 items-center justify-center gap-2 rounded-xl border-2 px-2 py-2 text-xs font-bold ${avatarId === id ? 'border-yellow-300 bg-sky-700' : 'border-slate-500 bg-slate-900'}`}>
                {id === 'mario' ? <MarioSprite size={38} /> : <LuigiSprite size={38} />}<span>{id === 'mario' ? 'RED' : 'GREEN'}</span>
              </button>
            ))}
          </div>
          {socket.lastError && (
            <div role="alert" className="mt-4 rounded-lg border border-red-400 bg-red-950 p-3 text-sm text-red-100">
              {socket.lastError}
              <button type="button" className="ml-2 underline" onClick={socket.clearError}>Dismiss</button>
            </div>
          )}
          <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); socket.joinAsPlayer(studentId.trim(), name.trim(), avatarId); }}>
            <label className="block text-sm font-bold" htmlFor="student-id">
              Student ID / roll number
              <input id="student-id" required minLength={3} maxLength={80} value={studentId} onChange={event => setStudentId(event.target.value.toUpperCase())} placeholder="e.g. 23BCS041" className="mt-2 w-full rounded-lg border-2 border-slate-500 bg-slate-950 p-3 text-base text-white" />
            </label>
            <label className="block text-sm font-bold" htmlFor="player-name">
              Display name
              <input id="player-name" required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Aarav Sharma" className="mt-2 w-full rounded-lg border-2 border-slate-500 bg-slate-950 p-3 text-base text-white" />
            </label>
            <button disabled={!socket.isConnected} className="min-h-14 w-full rounded-xl border-2 border-yellow-300 bg-red-600 px-4 py-3 font-pixel text-sm text-white disabled:opacity-50">
              {socket.isConnected ? 'JOIN LOBBY ▶' : 'CONNECTING…'}
            </button>
          </form>
          <form className="mt-5 border-t border-slate-600 pt-4" onSubmit={event => { event.preventDefault(); if (recoveryInput.trim()) socket.reconnectWithToken(recoveryInput.trim()); }}>
            <label className="block text-xs text-slate-200" htmlFor="recover-token">
              Recovery token from host
              <input id="recover-token" value={recoveryInput} onChange={event => setRecoveryInput(event.target.value)} placeholder="Paste token here" className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm text-white" />
            </label>
            <button disabled={!recoveryInput.trim() || !socket.isConnected} className="mt-3 min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-bold disabled:opacity-50">
              Restore my game
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
