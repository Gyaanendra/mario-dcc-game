import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { useGameSocket } from '../utils/socket';
import { chiptune } from '../audio/chiptune';
import {
  MarioSprite,
  LuigiSprite
} from '../utils/pixelSprites';
import { MarioRunnerCanvas } from '../components/MarioRunnerCanvas';
import { Trophy, Clock, Users, Sparkles, Volume2, VolumeX } from 'lucide-react';

export const ProjectorView: React.FC = () => {
  const {
    gameState,
    activeQuestion,
    answerStats,
    leaderboard,
    podium,
    counts,
    remainingSeconds
  } = useGameSocket('PROJECTOR');

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isMuted, setIsMuted] = useState(chiptune.getMuted());
  const [bossTimer, setBossTimer] = useState(120);
  const [bossTimerRunning, setBossTimerRunning] = useState(false);
  const bossIntervalRef = useRef<any>(null);

  // Generate QR code for player join URL
  useEffect(() => {
    const origin = window.location.origin;
    QRCode.toDataURL(origin, {
      width: 260,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }).then((url) => {
      setQrDataUrl(url);
    });
  }, []);

  // Audio effects triggered by state transitions
  useEffect(() => {
    if (gameState.game_status === 'QUESTION_ACTIVE' && remainingSeconds <= 5 && remainingSeconds > 0) {
      chiptune.playTick();
    }
  }, [remainingSeconds, gameState.game_status]);

  useEffect(() => {
    if (gameState.game_status === 'REVEAL') {
      chiptune.playPowerUp();
    } else if (gameState.game_status === 'BOWSER_STAGE') {
      chiptune.playBossRoar();
    } else if (gameState.game_status === 'PODIUM_WINNERS') {
      chiptune.playVictory();
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
      const interval = setInterval(() => {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 }
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [gameState.game_status]);

  // Boss challenge presentation 2-minute timer
  useEffect(() => {
    if (bossTimerRunning) {
      bossIntervalRef.current = setInterval(() => {
        setBossTimer((prev) => {
          if (prev <= 1) {
            clearInterval(bossIntervalRef.current);
            setBossTimerRunning(false);
            chiptune.playWrong();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (bossIntervalRef.current) clearInterval(bossIntervalRef.current);
    }
    return () => {
      if (bossIntervalRef.current) clearInterval(bossIntervalRef.current);
    };
  }, [bossTimerRunning]);

  const toggleSound = () => {
    const muted = chiptune.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="w-screen h-screen bg-[#0E101D] text-white flex flex-col justify-between overflow-hidden relative select-none scanlines font-sans">
      {/* =========================================================================
          TOP STAGE HEADER
          ========================================================================= */}
      <header className="bg-[#171B30] border-b-4 border-black px-8 py-3 flex items-center justify-between z-20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MarioSprite size={32} />
            <div>
              <div className="font-pixel text-[10px] text-red-500 tracking-wider">DEAN CAREER CLOUD</div>
              <div className="font-pixel text-xs text-yellow-400">MARIO CAREER QUEST</div>
            </div>
          </div>
          <div className="h-6 w-0.5 bg-zinc-700" />
          <div className="text-xs font-mono text-zinc-400">
            BENNETT UNIVERSITY • SCSET
          </div>
        </div>

        {/* Center Level Badge */}
        <div className="flex items-center gap-3 px-4 py-1.5 bg-black/60 border-2 border-yellow-500 rounded-lg">
          <span className="font-pixel text-xs text-yellow-300">
            {gameState.current_level === 0 && 'QUEST LOBBY'}
            {gameState.current_level === 1 && 'LEVEL 1: START YOUR QUEST'}
            {gameState.current_level === 2 && 'LEVEL 2: QUESTION BLOCK'}
            {gameState.current_level === 3 && "LEVEL 3: BOWSER'S BOSS BATTLE"}
          </span>
        </div>

        {/* Right Stats: Connected count + Audio Mute */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-sm bg-zinc-800/80 px-3 py-1 rounded border border-zinc-700">
            <Users size={16} className="text-green-400" />
            <span className="text-green-400 font-bold">{counts.connected}</span>
            <span className="text-zinc-400">/ {counts.total} Registered</span>
          </div>
          <button
            onClick={toggleSound}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-600 text-zinc-300"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          RETRO 2D MARIO RUNNER CANVAS (60 FPS Side-scroller)
          ========================================================================= */}
      <MarioRunnerCanvas
        status={gameState.game_status}
        category={activeQuestion?.category}
        height={210}
        interactive={true}
      />

      {/* =========================================================================
          MAIN ARENA CONTENT AREA
          ========================================================================= */}
      <main className="flex-1 p-6 flex flex-col justify-center items-center z-10 max-w-7xl mx-auto w-full overflow-y-auto">
        {/* 1. LOBBY VIEW: QR CODE & INSTRUCTIONS */}
        {gameState.game_status === 'LOBBY' && (
          <div className="grid grid-cols-12 gap-8 items-center w-full max-w-5xl">
            {/* Left Column: Instructions */}
            <div className="col-span-7 space-y-4">
              <div className="inline-block px-3 py-1 bg-red-600/20 border-2 border-red-500 rounded text-xs font-pixel text-red-400">
                QUEST OPENS SHORTLY
              </div>
              <h1 className="text-4xl font-black font-pixel text-yellow-400 leading-tight drop-shadow-lg">
                MASK ON.<br />LEVEL UP.
              </h1>
              <p className="text-base text-zinc-300 leading-relaxed font-sans">
                Scan the QR code on your phone to join the live arena. Answer placement and career questions, identify recruitment red flags, and face Bowser in the finale!
              </p>

              <div className="p-4 bg-[#171B30] border-2 border-zinc-700 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2 text-yellow-300">
                  <span className="font-pixel text-[10px]">1.</span>
                  <span>Scan QR Code or visit URL on your smartphone</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="font-pixel text-[10px]">2.</span>
                  <span>Enter Roll No & Name • Choose your 8-bit avatar</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="font-pixel text-[10px]">3.</span>
                  <span>Top 50 advance to Level 2 • Top 10 battle Bowser!</span>
                </div>
              </div>
            </div>

            {/* Right Column: High-Contrast QR Code Card */}
            <div className="col-span-5 flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl border-4 border-yellow-500 shadow-2xl pixel-box">
                {qrDataUrl && <img src={qrDataUrl} alt="Join QR Code" className="w-56 h-56" />}
              </div>
              <div className="mt-3 text-center">
                <div className="font-pixel text-[10px] text-zinc-400">JOIN URL:</div>
                <div className="font-mono text-base font-bold text-yellow-300 mt-0.5">{window.location.origin}</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. LEVEL INTRO VIEW */}
        {gameState.game_status === 'LEVEL_INTRO' && (
          <div className="text-center space-y-4 max-w-2xl animate-fade-in">
            <div className="font-pixel text-xs text-sky-400 tracking-widest uppercase">
              LEVEL {gameState.current_level} OF 3
            </div>
            <h1 className="font-pixel text-3xl text-yellow-400 drop-shadow-md">
              {gameState.current_level === 1 && 'LEVEL 1 — START YOUR QUEST'}
              {gameState.current_level === 2 && 'LEVEL 2 — QUESTION BLOCK'}
              {gameState.current_level === 3 && "LEVEL 3 — BOWSER'S BOSS CHALLENGE"}
            </h1>
            <p className="text-base text-zinc-300 font-sans leading-relaxed">
              {gameState.current_level === 1 &&
                'Career and placement fundamentals. Speed and accuracy earn coins. Top 50 qualify for Level 2!'}
              {gameState.current_level === 2 &&
                'Myth-busting and recruitment red flags. Read every option carefully. Top 10 advance to the Final Boss!'}
              {gameState.current_level === 3 &&
                'The ultimate career decision dilemma. Finalists present reasoning live on stage to the faculty panel!'}
            </p>
          </div>
        )}

        {/* 3. ACTIVE QUESTION / LOCKED / REVEAL VIEW */}
        {(gameState.game_status === 'QUESTION_ACTIVE' ||
          gameState.game_status === 'QUESTION_LOCKED' ||
          gameState.game_status === 'REVEAL' ||
          gameState.game_status === 'PAUSED') &&
          activeQuestion && (
            <div className="w-full max-w-4xl space-y-4">
              {/* Question Top Header Bar */}
              <div className="flex items-center justify-between bg-[#171B30] p-3 rounded-xl border-2 border-zinc-700 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded font-pixel text-xs text-yellow-400">
                    QUESTION #{activeQuestion.id}
                  </div>
                  <div className="px-3 py-1 bg-black/50 border border-zinc-600 rounded font-mono text-xs font-bold text-sky-300">
                    {activeQuestion.category}
                  </div>
                </div>

                {/* Pulsing Timer */}
                <div className="flex items-center gap-2">
                  <Clock size={18} className={remainingSeconds <= 5 ? 'text-red-500 animate-spin' : 'text-yellow-400'} />
                  <div
                    className={`font-pixel text-xl px-4 py-1 rounded-lg border-2 ${
                      remainingSeconds <= 5
                        ? 'bg-red-600 border-white text-white animate-pulse'
                        : 'bg-black border-yellow-400 text-yellow-300'
                    }`}
                  >
                    {remainingSeconds}s
                  </div>
                </div>
              </div>

              {/* Question Text Box */}
              <div className="bg-[#171B30] border-2 border-zinc-700 p-5 rounded-2xl shadow-xl">
                <h2 className="text-xl font-bold text-white leading-relaxed font-sans">
                  {activeQuestion.prompt}
                </h2>
              </div>

              {/* 4 Large High-Contrast Answer Option Cards */}
              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { key: 'A', text: activeQuestion.option_a, color: 'border-red-500 bg-red-950/40 text-red-100', barColor: 'bg-red-500' },
                  { key: 'B', text: activeQuestion.option_b, color: 'border-blue-500 bg-blue-950/40 text-blue-100', barColor: 'bg-blue-500' },
                  { key: 'C', text: activeQuestion.option_c, color: 'border-yellow-500 bg-yellow-950/40 text-yellow-100', barColor: 'bg-yellow-500' },
                  { key: 'D', text: activeQuestion.option_d, color: 'border-green-500 bg-green-950/40 text-green-100', barColor: 'bg-green-500' }
                ]
                  .filter((opt) => opt.text)
                  .map((opt) => {
                    const isRevealed = gameState.game_status === 'REVEAL';
                    const isCorrect = isRevealed && activeQuestion.correct_option === opt.key;
                    const count = answerStats ? answerStats[opt.key] || 0 : 0;
                    const totalAnswers = answerStats?.total || 1;
                    const percent = Math.round((count / totalAnswers) * 100);

                    return (
                      <div
                        key={opt.key}
                        className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col justify-between ${
                          isCorrect
                            ? 'border-green-400 bg-green-900/80 ring-4 ring-green-300 scale-[1.01] shadow-2xl'
                            : isRevealed
                            ? 'border-zinc-800 bg-zinc-900/60 opacity-60'
                            : opt.color
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-pixel text-xs px-2.5 py-1 bg-black/60 border border-white/40 rounded text-white shrink-0">
                            {opt.key}
                          </span>
                          <span className="text-base font-semibold leading-snug font-sans">{opt.text}</span>
                        </div>

                        {/* Answer Statistics Bar Chart on Reveal */}
                        {isRevealed && (
                          <div className="mt-2.5 pt-2 border-t border-white/10">
                            <div className="flex justify-between text-[11px] font-mono mb-1 text-zinc-300">
                              <span>{count} votes</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="w-full bg-black/50 h-2.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${opt.barColor} transition-all duration-700`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Explanation Box on Reveal */}
              {gameState.game_status === 'REVEAL' && activeQuestion.explanation && (
                <div className="bg-sky-950/80 border-2 border-sky-400 p-4 rounded-xl shadow-xl flex items-start gap-3 animate-fade-in">
                  <Sparkles size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-pixel text-xs text-sky-300 mb-0.5">CAREER TEACHING POINT</div>
                    <p className="text-sm font-sans text-zinc-200 leading-relaxed">
                      {activeQuestion.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* 4. LEADERBOARD VIEW */}
        {gameState.game_status === 'LEVEL_LEADERBOARD' && (
          <div className="w-full max-w-3xl space-y-4">
            <div className="text-center">
              <h2 className="font-pixel text-2xl text-yellow-400">
                LEVEL {gameState.current_level} LEADERBOARD
              </h2>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                {gameState.current_level === 1 && 'Top 50 Qualify for Level 2 (Question Block)'}
                {gameState.current_level === 2 && 'Top 10 Qualify for Bowser Boss Battle Finale'}
              </p>
            </div>

            <div className="bg-[#171B30] border-2 border-zinc-700 rounded-2xl p-4 shadow-xl max-h-[42vh] overflow-y-auto">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="border-b-2 border-zinc-700 font-pixel text-xs text-yellow-400">
                    <th className="py-2 px-3">RANK</th>
                    <th className="py-2 px-3">PLAYER</th>
                    <th className="py-2 px-3">ROLL NO</th>
                    <th className="py-2 px-3 text-right">COINS</th>
                    <th className="py-2 px-3 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-xs">
                  {leaderboard.slice(0, 10).map((player, idx) => (
                    <tr
                      key={player.id}
                      className={`hover:bg-zinc-800/40 ${
                        idx < 3 ? 'bg-yellow-500/10 font-bold' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-pixel text-[11px]">
                        {idx === 0 && '🥇 #1'}
                        {idx === 1 && '🥈 #2'}
                        {idx === 2 && '🥉 #3'}
                        {idx > 2 && `#${idx + 1}`}
                      </td>
                      <td className="py-2 px-3 flex items-center gap-2">
                        {player.avatar_id === 'luigi' ? <LuigiSprite size={20} /> : <MarioSprite size={20} />}
                        <span className="font-sans font-bold text-white">{player.name}</span>
                      </td>
                      <td className="py-2 px-3 text-zinc-400">{player.student_id}</td>
                      <td className="py-2 px-3 text-right font-pixel text-xs text-yellow-400">
                        {player.total_coins}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {(gameState.current_level === 1 ? player.is_qualified_level2 : player.is_qualified_level3) ? (
                          <span className="px-2 py-0.5 bg-green-600/30 border border-green-500 rounded text-[10px] text-green-300 font-bold">
                            QUALIFIED
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[10px]">In Quest</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. BOWSER BOSS STAGE VIEW */}
        {gameState.game_status === 'BOWSER_STAGE' && (
          <div className="w-full max-w-4xl space-y-4">
            <div className="flex items-center justify-between bg-purple-950/80 border-2 border-purple-600 p-4 rounded-2xl shadow-xl">
              <div>
                <div className="font-pixel text-[10px] text-red-400">FINAL LEVEL</div>
                <h1 className="font-pixel text-xl text-yellow-300">BOWSER'S BOSS CHALLENGE</h1>
                <p className="text-xs font-mono text-purple-200 mt-0.5">10 Finalists • 2 Minutes Defense • 20 Points Rubric</p>
              </div>

              {/* 2-Minute Speaker Timer */}
              <div className="flex items-center gap-3 bg-black/60 p-3 rounded-xl border border-purple-500">
                <div className="text-right">
                  <div className="text-[9px] font-mono text-zinc-400">SPEAKER CLOCK</div>
                  <div className="font-pixel text-xl text-yellow-400">
                    {Math.floor(bossTimer / 60)}:{(bossTimer % 60).toString().padStart(2, '0')}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setBossTimerRunning(!bossTimerRunning)}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-[10px] font-pixel rounded"
                  >
                    {bossTimerRunning ? 'PAUSE' : 'START'}
                  </button>
                  <button
                    onClick={() => {
                      setBossTimerRunning(false);
                      setBossTimer(120);
                    }}
                    className="px-2.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-[9px] font-mono rounded"
                  >
                    RESET
                  </button>
                </div>
              </div>
            </div>

            {/* The Case Prompt Card */}
            <div className="bg-[#171B30] border-2 border-zinc-700 p-5 rounded-2xl space-y-3 shadow-xl">
              <div className="font-pixel text-xs text-yellow-400">THE CAREER CASE SCENARIO</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-zinc-900 border-2 border-red-500 rounded-xl">
                  <div className="font-pixel text-xs text-red-400 mb-1">OFFER A</div>
                  <div className="text-sm font-semibold text-white">₹45,000 / month Stipend</div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    Early-stage startup • No senior engineering mentor • Unclear deliverables.
                  </p>
                </div>
                <div className="p-3.5 bg-zinc-900 border-2 border-green-500 rounded-xl">
                  <div className="font-pixel text-xs text-green-400 mb-1">OFFER B</div>
                  <div className="text-sm font-semibold text-white">₹18,000 / month Stipend</div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    Established org • Staff Engineer mentor • Production code ownership & strong PPO history.
                  </p>
                </div>
              </div>
              <div className="p-3 bg-black/40 border border-zinc-700 rounded-lg text-xs font-mono text-yellow-300">
                <strong>Question for Finalist:</strong> Which offer do you choose, what trade-off do you accept, and what 2 things do you verify before signing?
              </div>
            </div>
          </div>
        )}

        {/* 6. PODIUM WINNERS VIEW */}
        {gameState.game_status === 'PODIUM_WINNERS' && (
          <div className="w-full max-w-3xl space-y-6 text-center animate-fade-in">
            <div className="flex justify-center items-center gap-3">
              <Trophy size={36} className="text-yellow-400 animate-bounce" />
              <h1 className="font-pixel text-3xl text-yellow-400 drop-shadow-lg">
                VICTORY PODIUM
              </h1>
              <Trophy size={36} className="text-yellow-400 animate-bounce" />
            </div>

            {/* 3 Step Podium Platforms */}
            <div className="flex justify-center items-end gap-5 pt-6">
              {/* 2nd Place */}
              {podium[1] && (
                <div className="flex flex-col items-center">
                  <LuigiSprite size={40} />
                  <div className="mt-1 text-sm font-bold text-white font-sans">{podium[1].name}</div>
                  <div className="text-[10px] font-mono text-zinc-400">{podium[1].student_id}</div>
                  <div className="mt-2 w-40 h-32 bg-zinc-700 border-4 border-zinc-500 rounded-t-xl flex flex-col items-center justify-center pixel-box">
                    <span className="font-pixel text-2xl text-zinc-300">2ND</span>
                    <span className="text-[10px] font-mono text-zinc-400 mt-1">Score: {podium[1].total_score}/20</span>
                  </div>
                </div>
              )}

              {/* 1st Place Champion */}
              {podium[0] && (
                <div className="flex flex-col items-center">
                  <MarioSprite size={52} className="animate-pulse" />
                  <div className="mt-1 text-base font-black text-yellow-300 font-sans">{podium[0].name}</div>
                  <div className="text-[10px] font-mono text-yellow-400">{podium[0].student_id}</div>
                  <div className="mt-2 w-48 h-44 bg-yellow-600 border-4 border-yellow-300 rounded-t-2xl flex flex-col items-center justify-center pixel-box shadow-2xl">
                    <Trophy size={28} className="text-yellow-200 mb-1" />
                    <span className="font-pixel text-3xl text-white">1ST</span>
                    <span className="font-mono text-xs font-bold text-yellow-100 mt-1">Score: {podium[0].total_score}/20</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {podium[2] && (
                <div className="flex flex-col items-center">
                  <MarioSprite size={40} />
                  <div className="mt-1 text-sm font-bold text-white font-sans">{podium[2].name}</div>
                  <div className="text-[10px] font-mono text-zinc-400">{podium[2].student_id}</div>
                  <div className="mt-2 w-40 h-24 bg-amber-800 border-4 border-amber-600 rounded-t-xl flex flex-col items-center justify-center pixel-box">
                    <span className="font-pixel text-xl text-amber-300">3RD</span>
                    <span className="text-[10px] font-mono text-amber-200 mt-1">Score: {podium[2].total_score}/20</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          RETRO STAGE FOOTER
          ========================================================================= */}
      <footer className="w-full bg-[#171B30] border-t-2 border-black px-6 py-2 flex items-center justify-between text-xs font-mono text-zinc-400 z-20">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-ping" />
          <span>STAGE BROADCAST ACTIVE • 60 FPS</span>
        </div>
        <div className="font-pixel text-[9px] text-zinc-500">
          MARIO CAREER QUEST • DEAN CAREER CLOUD 2026
        </div>
      </footer>
    </div>
  );
};
