import React, { useEffect } from 'react';
import GameScene from './components/GameScene';
import UI from './components/UI';
import Intro from './components/Intro';
import { useGameStore } from './store';

const App: React.FC = () => {
  const status = useGameStore((state) => state.status);
  const tickTimer = useGameStore((state) => state.tickTimer);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (status === 'playing') {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, tickTimer]);

  return (
    <div className="relative w-full h-full bg-stone-900 text-stone-100 font-sans selection:bg-orange-500 selection:text-white">
      {status !== 'intro' ? (
        <>
          <div className="absolute inset-0 z-0">
            <GameScene />
          </div>
          <div className="absolute inset-0 z-10 pointer-events-none">
            <UI />
          </div>
        </>
      ) : (
        <Intro />
      )}
    </div>
  );
};

export default App;