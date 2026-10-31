import React, { useState, useEffect } from 'react';
import { useGameSocket } from '../utils/socket';
import { MarioSprite, LuigiSprite } from '../utils/pixelSprites';

interface LoginViewProps {
  onGameStart: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onGameStart }) => {
  const { player, joinAsPlayer, isConnected } = useGameSocket('PLAYER');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('mario');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (player) {
      onGameStart();
    }
  }, [player, onGameStart]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !name.trim()) return;
    setIsSubmitting(true);
    joinAsPlayer(studentId.trim(), name.trim(), selectedAvatar);
  };

  return (
    <div className="min-h-screen bg-[#0D101D] text-white flex flex-col justify-between p-4 max-w-md mx-auto">
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

      <div className="my-6 flex flex-col items-center">
        <div className="p-4 bg-[#181C2E] border-4 border-yellow-500 rounded-2xl shadow-xl mb-4">
          {selectedAvatar === 'mario' ? <MarioSprite size={72} /> : <LuigiSprite size={72} />}
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setSelectedAvatar('mario')}
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
            onClick={() => setSelectedAvatar('luigi')}
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

        {!isConnected && (
          <div className="text-center text-xs text-red-400 font-mono">Connecting to server...</div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !isConnected}
          className="w-full py-4 mt-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-pixel text-sm rounded-xl border-4 border-black shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>{isSubmitting ? 'JOINING...' : 'START QUEST'}</span>
          <span className="text-yellow-300">▶</span>
        </button>
      </form>

      <div className="py-4 text-center text-xs text-zinc-500 font-mono">
        <span>School of Computer Science Engineering & Technology</span>
      </div>
    </div>
  );
};
