import React, { useState, useEffect, lazy, Suspense } from 'react';
import { PlayerView } from './views/PlayerView';
import { ProjectorView } from './views/ProjectorView';
import { HostView } from './views/HostView';

const GameView = lazy(() => import('./game/GameView').then(m => ({ default: m.GameView })));

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showNavHelper = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (currentPath === '/play' || currentPath === '/game') {
    return (
      <Suspense fallback={
        <div className="fixed inset-0 bg-[#0D101D] flex items-center justify-center">
          <div className="text-center">
            <div className="font-pixel text-yellow-400 text-lg mb-2">LOADING...</div>
            <div className="text-zinc-400 text-xs font-mono">Preparing your quest</div>
          </div>
        </div>
      }>
        <GameView />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Route Views */}
      {currentPath === '/projector' || currentPath === '/screen' ? (
        <ProjectorView />
      ) : currentPath === '/host' || currentPath === '/admin' ? (
        <HostView />
      ) : (
        <PlayerView />
      )}

      {/* Floating dev navigation bar for quick testing */}
      {showNavHelper && (
        <div className="fixed bottom-2 right-2 z-50 flex items-center gap-1.5 p-1.5 bg-black/80 backdrop-blur border border-zinc-700 rounded-xl text-[10px] font-mono shadow-2xl">
          <span className="text-zinc-400 px-1">VIEW:</span>
          <button
            onClick={() => navigateTo('/')}
            className={`px-2 py-1 rounded transition-colors ${
              currentPath === '/' ? 'bg-red-600 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            Phone
          </button>
          <button
            onClick={() => navigateTo('/play')}
            className={`px-2 py-1 rounded transition-colors ${
              currentPath === '/play' ? 'bg-green-600 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            Game
          </button>
          <button
            onClick={() => navigateTo('/projector')}
            className={`px-2 py-1 rounded transition-colors ${
              currentPath === '/projector' ? 'bg-yellow-600 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            Projector
          </button>
          <button
            onClick={() => navigateTo('/host')}
            className={`px-2 py-1 rounded transition-colors ${
              currentPath === '/host' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            Host
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
