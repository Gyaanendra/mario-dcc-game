import React, { useState, useEffect } from 'react';
import { useGameSocket } from '../utils/socket';
import { chiptune } from '../audio/chiptune';
import { MarioSprite, LuigiSprite, CoinSprite, RedFlagGhost } from '../utils/pixelSprites';
import { QuestionBlockPhysics } from '../components/QuestionBlockPhysics';
import { MarioRunnerCanvas } from '../components/MarioRunnerCanvas';
import { Volume2, VolumeX, Wifi, WifiOff, Award, AlertTriangle, ShieldCheck } from 'lucide-react';

export const PlayerView: React.FC = () => {
  const {
    isConnected,
    gameState,
    player,
    activeQuestion,
    myAnswer,
    remainingSeconds,
    joinAsPlayer,
    submitAnswer
  } = useGameSocket('PLAYER');

  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('mario');
  const [isMuted, setIsMuted] = useState(chiptune.getMuted());
  const [burstTrigger, setBurstTrigger] = useState(false);

  // Play audio cues based on game status
  useEffect(() => {
    if (gameState.game_status === 'QUESTION_ACTIVE' && myAnswer === null && remainingSeconds <= 5 && remainingSeconds > 0) {
      chiptune.playTick();
    }
  }, [remainingSeconds, gameState.game_status, myAnswer]);

  useEffect(() => {
    if (gameState.game_status === 'REVEAL' && myAnswer) {
      if (myAnswer.is_correct) {
        chiptune.playPowerUp();
        setBurstTrigger(true);
      } else {
        chiptune.playWrong();
      }
    }
  }, [gameState.game_status, myAnswer]);

  const toggleSound = () => {
    const muted = chiptune.toggleMute();
    setIsMuted(muted);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !name.trim()) return;
    chiptune.playJump();
    joinAsPlayer(studentId.trim(), name.trim(), selectedAvatar);
  };

  const handleSelectOption = (opt: string) => {
    if (myAnswer || gameState.game_status !== 'QUESTION_ACTIVE') return;
    chiptune.playCoin();
    submitAnswer(opt);
    setBurstTrigger(true);
  };

  // 1. Join / Registration Screen
  if (!player) {
    return (
      <div className="min-h-screen bg-[#0D101D] text-white flex flex-col justify-between p-4 max-w-md mx-auto">
        {/* Header Badge */}
        <div className="pt-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/40 rounded-full text-xs font-mono text-red-400 mb-2">
            <span>DEAN CAREER CLOUD</span>
            <span>•</span>
            <span>BENNETT UNIVERSITY</span>
          </div>
          <h1 className="text-2xl font-black tracking-wider font-pixel text-yellow-400 drop-shadow-md">
            MARIO CAREER QUEST
          </h1>
          <p className="text-xs text-sky-300 font-mono mt-1">MASK ON. LEVEL UP.</p>
        </div>

        {/* Center Interactive Avatar Preview */}
        <div className="my-6 flex flex-col items-center">
          <div className="p-4 bg-[#181C2E] border-4 border-yellow-500 rounded-2xl pixel-box shadow-xl mb-4">
            {selectedAvatar === 'mario' ? <MarioSprite size={72} /> : <LuigiSprite size={72} />}
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setSelectedAvatar('mario');
                chiptune.playJump();
              }}
              className={`px-4 py-2 font-pixel text-xs rounded border-2 transition-transform ${
                selectedAvatar === 'mario'
                  ? 'bg-red-600 border-yellow-400 scale-105 shadow-md'
                  : 'bg-zinc-800 border-zinc-600 text-zinc-400'
              }`}
            >
              MARIO
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedAvatar('luigi');
                chiptune.playJump();
              }}
              className={`px-4 py-2 font-pixel text-xs rounded border-2 transition-transform ${
                selectedAvatar === 'luigi'
                  ? 'bg-green-600 border-yellow-400 scale-105 shadow-md'
                  : 'bg-zinc-800 border-zinc-600 text-zinc-400'
              }`}
            >
              LUIGI
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleJoin} className="bg-[#181C2E] p-6 rounded-2xl border-2 border-zinc-700/80 shadow-2xl space-y-4">
          <div>
            <label className="block text-xs font-pixel text-yellow-400 mb-2">STUDENT ID / ROLL NO</label>
            <input
              type="text"
              required
              placeholder="e.g. 23BCS041"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className="w-full bg-[#0D101D] border-2 border-zinc-600 focus:border-yellow-400 rounded-lg p-3 text-sm font-mono tracking-wider outline-none text-yellow-200"
            />
          </div>

          <div>
            <label className="block text-xs font-pixel text-yellow-400 mb-2">PLAYER DISPLAY NAME</label>
            <input
              type="text"
              required
              placeholder="e.g. Aarav Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0D101D] border-2 border-zinc-600 focus:border-yellow-400 rounded-lg p-3 text-sm font-mono outline-none text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-pixel text-sm rounded-xl border-4 border-black pixel-box shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>START QUEST</span>
            <span className="text-yellow-300">▶</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="py-4 text-center text-xs text-zinc-500 font-mono">
          <span>School of Computer Science Engineering & Technology</span>
        </div>
      </div>
    );
  }

  // Check Qualification status
  const isLevel2 = gameState.current_level === 2;
  const isLevel3 = gameState.current_level === 3;
  const isEliminatedLevel2 = isLevel2 && !player.is_qualified_level2;
  const isEliminatedLevel3 = isLevel3 && !player.is_qualified_level3;

  return (
    <div className="min-h-screen bg-[#0D101D] text-white flex flex-col justify-between max-w-md mx-auto select-none">
      {/* TOP HUD BAR */}
      <div className="bg-[#181C2E] border-b-4 border-black px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {player.avatar_id === 'luigi' ? <LuigiSprite size={28} /> : <MarioSprite size={28} />}
          <div>
            <div className="font-pixel text-[10px] text-zinc-200 truncate max-w-[110px]">{player.name}</div>
            <div className="text-[10px] text-zinc-400 font-mono">{player.student_id}</div>
          </div>
        </div>

        {/* Coin Counter */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/50 border border-yellow-500/50 rounded-lg">
          <CoinSprite size={18} />
          <span className="font-pixel text-xs text-yellow-400 tracking-wider">
            x {player.total_coins}
          </span>
        </div>

        {/* Controls: Mute + Connection */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-600 text-zinc-300"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div title={isConnected ? 'Connected' : 'Reconnecting'}>
            {isConnected ? (
              <Wifi size={16} className="text-green-400 animate-pulse" />
            ) : (
              <WifiOff size={16} className="text-red-400 animate-bounce" />
            )}
          </div>
        </div>
      </div>

      {/* AUDIENCE / SPECTATOR NOTICE IF ELIMINATED */}
      {(isEliminatedLevel2 || isEliminatedLevel3) && (
        <div className="bg-purple-900/60 border-y-2 border-purple-500 px-4 py-2 flex items-center gap-2 text-xs text-purple-200 font-mono">
          <Award size={18} className="text-yellow-400 shrink-0" />
          <span>Great effort! You are now in <strong>Audience Spectator Mode</strong>. Look up at the big screen!</span>
        </div>
      )}

      {/* 2D RETRO MARIO RUNNER HEADER */}
      <MarioRunnerCanvas
        status={gameState.game_status}
        category={activeQuestion?.category}
        isCorrect={myAnswer?.is_correct}
        height={110}
        interactive={true}
      />

      {/* MAIN GAMEPLAY CONTENT CONTAINER */}
      <div className="flex-1 p-4 flex flex-col justify-center">
        {/* 1. LOBBY STATE */}
        {gameState.game_status === 'LOBBY' && (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center">
              <QuestionBlockPhysics size={72} triggerBurst={burstTrigger} />
            </div>
            <h2 className="font-pixel text-base text-yellow-400">QUEST LOBBY</h2>
            <p className="text-xs text-zinc-400 font-mono px-4 leading-relaxed">
              You are connected! Keep your phone on and wait for the Host to open Level 1 on the projector.
            </p>
            <div className="inline-block px-3 py-1 bg-green-950 border border-green-500 rounded text-[11px] font-mono text-green-300">
              ● READY FOR QUEST
            </div>
          </div>
        )}

        {/* 2. LEVEL INTRO STATE */}
        {gameState.game_status === 'LEVEL_INTRO' && (
          <div className="text-center py-8 space-y-4">
            <div className="font-pixel text-xs text-sky-400 tracking-widest uppercase">
              LEVEL {gameState.current_level}
            </div>
            <h2 className="font-pixel text-xl text-yellow-300">
              {gameState.current_level === 1 && 'START YOUR QUEST'}
              {gameState.current_level === 2 && 'QUESTION BLOCK'}
              {gameState.current_level === 3 && "BOWSER'S BOSS BATTLE"}
            </h2>
            <p className="text-xs text-zinc-300 font-mono px-6">
              Get ready! The first question will open on your phone in moments.
            </p>
          </div>
        )}

        {/* 3. ACTIVE QUESTION / LOCKED / REVEAL STATE */}
        {(gameState.game_status === 'QUESTION_ACTIVE' ||
          gameState.game_status === 'QUESTION_LOCKED' ||
          gameState.game_status === 'REVEAL' ||
          gameState.game_status === 'PAUSED') &&
          activeQuestion && (
            <div className="space-y-4">
              {/* Category & Timer Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 border border-zinc-600 rounded text-[11px] font-mono font-bold">
                  {activeQuestion.category === 'RED FLAG' && <RedFlagGhost size={16} />}
                  <span className={activeQuestion.category === 'RED FLAG' ? 'text-red-400' : 'text-sky-300'}>
                    {activeQuestion.category}
                  </span>
                </div>

                <div
                  className={`font-pixel text-sm px-3 py-1 rounded border-2 ${
                    remainingSeconds <= 5
                      ? 'bg-red-600 border-red-400 text-white animate-pulse'
                      : 'bg-zinc-900 border-yellow-400 text-yellow-300'
                  }`}
                >
                  {remainingSeconds}s
                </div>
              </div>

              {/* Question Text Box */}
              <div className="bg-[#181C2E] border-2 border-zinc-700 p-4 rounded-xl shadow-lg">
                <p className="text-sm font-semibold text-zinc-100 leading-relaxed font-sans">
                  {activeQuestion.prompt}
                </p>
              </div>

              {/* Status Banner when locked / submitted */}
              {myAnswer && gameState.game_status !== 'REVEAL' && (
                <div className="bg-yellow-500/10 border border-yellow-500/40 p-2.5 rounded-lg text-center">
                  <span className="font-pixel text-xs text-yellow-400">
                    LOCKED IN: OPTION {myAnswer.selected_option}
                  </span>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Waiting for time to expire...</p>
                </div>
              )}

              {/* Reveal Result Banner */}
              {gameState.game_status === 'REVEAL' && (
                <div
                  className={`p-3 rounded-xl border-2 ${
                    myAnswer?.is_correct
                      ? 'bg-green-950/80 border-green-500 text-green-200'
                      : 'bg-red-950/80 border-red-500 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-pixel text-xs">
                    {myAnswer?.is_correct ? (
                      <>
                        <ShieldCheck size={18} className="text-green-400" />
                        <span>CORRECT! +{myAnswer.coins_awarded} COINS!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} className="text-red-400" />
                        <span>ANSWER: OPTION {activeQuestion.correct_option}</span>
                      </>
                    )}
                  </div>
                  {activeQuestion.explanation && (
                    <p className="text-xs font-mono mt-1.5 text-zinc-300 border-t border-zinc-700/60 pt-1.5">
                      {activeQuestion.explanation}
                    </p>
                  )}
                </div>
              )}

              {/* 4 Arcade Option Buttons */}
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {[
                  { key: 'A', text: activeQuestion.option_a, color: 'border-red-500 bg-red-950/40 hover:bg-red-900/50 text-red-100' },
                  { key: 'B', text: activeQuestion.option_b, color: 'border-blue-500 bg-blue-950/40 hover:bg-blue-900/50 text-blue-100' },
                  { key: 'C', text: activeQuestion.option_c, color: 'border-yellow-500 bg-yellow-950/40 hover:bg-yellow-900/50 text-yellow-100' },
                  { key: 'D', text: activeQuestion.option_d, color: 'border-green-500 bg-green-950/40 hover:bg-green-900/50 text-green-100' }
                ]
                  .filter((btn) => btn.text) // Only show options that exist
                  .map((btn) => {
                    const isSelected = myAnswer?.selected_option === btn.key;
                    const isCorrect = gameState.game_status === 'REVEAL' && activeQuestion.correct_option === btn.key;
                    const isWrong = gameState.game_status === 'REVEAL' && isSelected && !isCorrect;

                    let dynamicStyle = btn.color;
                    if (isSelected) {
                      dynamicStyle = 'bg-yellow-500 text-black border-white font-bold ring-2 ring-yellow-300 scale-[1.01]';
                    }
                    if (isCorrect) {
                      dynamicStyle = 'bg-green-600 text-white border-green-300 font-bold ring-4 ring-green-400 animate-pulse';
                    } else if (isWrong) {
                      dynamicStyle = 'bg-red-800 text-zinc-300 border-red-900 opacity-60';
                    }

                    return (
                      <button
                        key={btn.key}
                        type="button"
                        disabled={!!myAnswer || gameState.game_status !== 'QUESTION_ACTIVE' || isEliminatedLevel2 || isEliminatedLevel3}
                        onClick={() => handleSelectOption(btn.key)}
                        className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 flex items-start gap-3 disabled:cursor-not-allowed ${dynamicStyle}`}
                      >
                        <span className="font-pixel text-xs px-2 py-0.5 rounded bg-black/40 border border-white/20 shrink-0">
                          {btn.key}
                        </span>
                        <span className="text-xs font-sans leading-tight pt-0.5">{btn.text}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

        {/* 4. LEADERBOARD STATE */}
        {gameState.game_status === 'LEVEL_LEADERBOARD' && (
          <div className="text-center py-6 space-y-4">
            <h2 className="font-pixel text-base text-yellow-400">LEVEL COMPLETE!</h2>
            <p className="text-xs text-zinc-400 font-mono">
              The leaderboard is currently displayed on the main stage projector!
            </p>
            <div className="p-4 bg-[#181C2E] border-2 border-zinc-700 rounded-xl">
              <div className="text-xs font-mono text-zinc-400">YOUR CURRENT COINS:</div>
              <div className="font-pixel text-2xl text-yellow-300 mt-1">{player.total_coins}</div>
            </div>
          </div>
        )}

        {/* 5. BOWSER BOSS STAGE */}
        {gameState.game_status === 'BOWSER_STAGE' && (
          <div className="text-center py-6 space-y-4">
            <h2 className="font-pixel text-base text-purple-400">LEVEL 3: BOWSER'S BOSS CHALLENGE</h2>
            <p className="text-xs text-zinc-300 font-mono leading-relaxed">
              The Top 10 finalists are presenting their career decisions to the panel on stage!
            </p>
          </div>
        )}

        {/* 6. PODIUM WINNERS */}
        {gameState.game_status === 'PODIUM_WINNERS' && (
          <div className="text-center py-6 space-y-4">
            <h2 className="font-pixel text-lg text-yellow-400 animate-bounce">QUEST COMPLETED!</h2>
            <p className="text-xs text-zinc-300 font-mono">
              Look at the main projector screen to view the 1st, 2nd, and 3rd place winners!
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM FOOTER */}
      <div className="bg-[#181C2E] border-t-2 border-zinc-800 px-4 py-2.5 text-center text-[10px] text-zinc-500 font-mono">
        DEAN CAREER CLOUD • BENNETT UNIVERSITY
      </div>
    </div>
  );
};
