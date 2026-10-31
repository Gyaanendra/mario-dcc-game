import React, { Suspense, lazy, useState } from 'react';
import { useGameSocket } from '../utils/socket';
import { LuigiSprite, MarioSprite } from '../utils/pixelSprites';

const GameView = lazy(() => import('../game/GameView').then(module => ({ default: module.GameView })));

export const PlayerView: React.FC = () => {
  const socket = useGameSocket('PLAYER');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState<'mario' | 'luigi'>('mario');
  const [recoveryInput, setRecoveryInput] = useState('');

  if (socket.player) return <Suspense fallback={<div className="min-h-screen grid place-items-center bg-sky-800 text-white font-pixel">LOADING QUEST…</div>}><GameView key={socket.gameState.current_level >= 2 ? socket.gameState.current_level : 1} socket={socket} /></Suspense>;
  if (socket.isReconnecting) return <main className="min-h-screen grid place-items-center bg-[#0d2039] text-white p-6 text-center"><div><h1 className="font-pixel text-yellow-300 mb-4">RESTORING YOUR QUEST</h1><p>Your player and coins are being restored…</p></div></main>;

  return <main className="relative min-h-screen overflow-hidden bg-sky-700 text-white">
    <div className="absolute inset-0 bg-[url('/images/dcc-platform-world.png')] bg-cover bg-center" aria-hidden="true" />
    <div className="absolute inset-0 bg-gradient-to-b from-sky-950/40 via-sky-950/25 to-slate-950/80" aria-hidden="true" />
    <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-7 p-4 md:flex-row md:gap-12 md:p-8">
      <div className="w-full max-w-lg text-center md:text-left">
        <p className="inline-block rounded-full border border-white/40 bg-sky-950/75 px-4 py-2 text-xs font-bold tracking-widest">BENNETT UNIVERSITY · DEAN CAREER CLOUD</p>
        <h1 className="mt-6 font-pixel text-3xl leading-normal text-yellow-300 drop-shadow-[4px_5px_0_#17345c] md:text-5xl">MARIO<br />CAREER QUEST</h1>
        <p className="mt-5 text-lg font-semibold text-white drop-shadow-md">Run, jump, land on a pipe, and answer the live question to earn coins.</p>
        <p className="mt-3 text-sm text-white/90">Move with ← → or A/D. Jump with Space or ↑. Touch controls appear on phones. The host opens each round.</p>
      </div>
      <div className="w-full max-w-md rounded-2xl border-4 border-black bg-[#15243b]/95 p-5 shadow-[8px_8px_0_#0d1727] sm:p-7">
        <h2 className="font-pixel text-sm text-yellow-300">ENTER THE QUEST</h2>
        <div className="mt-5 flex gap-3" role="group" aria-label="Choose explorer">
          {(['mario', 'luigi'] as const).map(id => <button key={id} type="button" aria-pressed={avatarId === id} onClick={() => setAvatarId(id)} className={`flex min-h-20 flex-1 items-center justify-center gap-2 rounded-xl border-2 px-2 py-2 text-xs font-bold ${avatarId === id ? 'border-yellow-300 bg-sky-700' : 'border-slate-500 bg-slate-900'}`}>
            {id === 'mario' ? <MarioSprite size={38} /> : <LuigiSprite size={38} />}<span>{id === 'mario' ? 'RED' : 'GREEN'}</span>
          </button>)}
        </div>
        {socket.lastError && <div role="alert" className="mt-4 rounded-lg border border-red-400 bg-red-950 p-3 text-sm text-red-100">{socket.lastError}<button type="button" className="ml-2 underline" onClick={socket.clearError}>Dismiss</button></div>}
        <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); socket.joinAsPlayer(studentId.trim(), name.trim(), avatarId); }}>
          <label className="block text-sm font-bold" htmlFor="student-id">Student ID / roll number<input id="student-id" required minLength={3} maxLength={80} value={studentId} onChange={event => setStudentId(event.target.value.toUpperCase())} placeholder="e.g. 23BCS041" className="mt-2 w-full rounded-lg border-2 border-slate-500 bg-slate-950 p-3 text-base text-white" /></label>
          <label className="block text-sm font-bold" htmlFor="player-name">Display name<input id="player-name" required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Aarav Sharma" className="mt-2 w-full rounded-lg border-2 border-slate-500 bg-slate-950 p-3 text-base text-white" /></label>
          <button disabled={!socket.isConnected} className="min-h-14 w-full rounded-xl border-2 border-yellow-300 bg-red-600 px-4 py-3 font-pixel text-sm text-white disabled:opacity-50">{socket.isConnected ? 'START QUEST ▶' : 'CONNECTING…'}</button>
        </form>
        <form className="mt-5 border-t border-slate-600 pt-4" onSubmit={event => { event.preventDefault(); if (recoveryInput.trim()) socket.reconnectWithToken(recoveryInput.trim()); }}>
          <label className="block text-xs text-slate-200" htmlFor="recover-token">Recovery token from host<input id="recover-token" value={recoveryInput} onChange={event => setRecoveryInput(event.target.value)} placeholder="Paste token here" className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm text-white" /></label>
          <button disabled={!recoveryInput.trim() || !socket.isConnected} className="mt-3 min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-bold disabled:opacity-50">Restore my game</button>
        </form>
      </div>
    </div>
  </main>;
};
