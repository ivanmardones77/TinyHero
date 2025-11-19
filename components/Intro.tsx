import React from 'react';
import { useGameStore } from '../store';

const Intro: React.FC = () => {
  const startGame = useGameStore((state) => state.startGame);
  const generateLevel = useGameStore((state) => state.generateLevel);

  const handleStart = () => {
    generateLevel();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-stone-900 text-amber-50 p-8 text-center">
      <img 
        src="https://res.cloudinary.com/dfbcjsw25/image/upload/v1763552986/ratLogo_db0fdj.jpg" 
        alt="Operation: Tiny Hero Logo" 
        className="w-[200px] h-[200px] object-contain mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
      />
      <h1 className="text-6xl font-bold mb-4 tracking-tighter text-amber-500">Light Footsteps</h1>
      <div className="max-w-md space-y-6 text-lg text-stone-300 leading-relaxed">
        <p>
          You are a <strong>Hero Rat</strong>. Your job is to find landmines so humans can walk safely again.
        </p>
        <p className="text-amber-200 font-bold border-l-4 border-amber-500 pl-4 text-left">
            MISSION: Find 30 MINES in 60 SECONDS.
        </p>
        <ul className="text-left bg-stone-800 p-6 rounded-lg border border-stone-700 space-y-2">
          <li className="flex items-center"><span className="w-32 font-bold text-amber-400">MOUSE MOVE</span> Aim / Look</li>
          <li className="flex items-center"><span className="w-32 font-bold text-amber-400">W A S D</span> Move</li>
          <li className="flex items-center"><span className="w-32 font-bold text-amber-400">SHIFT</span> Sprint (Stamina)</li>
          <li className="flex items-center"><span className="w-32 font-bold text-amber-400">R-CLICK (HOLD)</span> Scent Vision</li>
          <li className="flex items-center"><span className="w-32 font-bold text-amber-400">L-CLICK</span> Scratch / Mark</li>
        </ul>
      </div>
      <button 
        onClick={handleStart}
        className="mt-12 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-full text-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
      >
        Begin Mission
      </button>
    </div>
  );
};

export default Intro;