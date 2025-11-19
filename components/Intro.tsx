import React, { useState } from 'react';
import { useGameStore, RATS } from '../store';

const Intro: React.FC = () => {
  const startGame = useGameStore((state) => state.startGame);
  const generateLevel = useGameStore((state) => state.generateLevel);
  const selectRat = useGameStore((state) => state.selectRat);
  const selectedRat = useGameStore((state) => state.selectedRat);

  const handleStart = () => {
    generateLevel();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-stone-900 text-amber-50 p-8 text-center overflow-y-auto">
      {/* Logo */}
      <div className="flex flex-col items-center mb-4">
        <img 
            src="https://res.cloudinary.com/dfbcjsw25/image/upload/v1763552986/ratLogo_db0fdj.jpg" 
            alt="Operation: Tiny Hero Logo" 
            className="w-[150px] h-[150px] object-contain mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
        />
        <h1 className="text-5xl font-bold tracking-tighter text-amber-500">Light Footsteps</h1>
      </div>

      {/* Brief Intro */}
      <div className="max-w-3xl space-y-2 text-lg text-stone-300 leading-relaxed mb-6">
        <p className="text-amber-200 font-bold border-l-4 border-amber-500 pl-4 text-left">
            MISSION: Find 30 MINES in 60 SECONDS.
        </p>
      </div>

      {/* RAT SELECTION */}
      <div className="w-full max-w-6xl mb-8">
          <h2 className="text-2xl font-black text-stone-400 mb-4 uppercase tracking-widest">Select Operative</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {RATS.map((rat) => {
                  const isSelected = selectedRat.id === rat.id;
                  return (
                    <div 
                        key={rat.id}
                        onClick={() => selectRat(rat)}
                        className={`relative group cursor-pointer rounded-xl p-4 border-2 transition-all duration-300 transform hover:-translate-y-1
                            ${isSelected 
                                ? 'bg-stone-800 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105 z-10' 
                                : 'bg-stone-900/50 border-stone-700 hover:border-stone-500 opacity-70 hover:opacity-100'
                            }
                        `}
                    >
                        <div className="flex flex-col items-center">
                            {/* Portrait */}
                            <div className="relative w-32 h-32 mb-4">
                                <img 
                                    src={rat.imageUrl} 
                                    alt={rat.name} 
                                    className={`w-full h-full object-cover rounded-full border-4 ${isSelected ? 'border-amber-500' : 'border-stone-600'}`}
                                />
                                {isSelected && (
                                    <div className="absolute bottom-0 right-0 bg-amber-500 text-black font-bold px-2 py-1 rounded-full text-xs">
                                        SELECTED
                                    </div>
                                )}
                            </div>
                            
                            {/* Info */}
                            <h3 className={`text-xl font-black uppercase ${isSelected ? 'text-amber-400' : 'text-stone-300'}`}>
                                {rat.name}
                            </h3>
                            <p className="text-xs font-bold tracking-widest text-stone-500 mb-2">{rat.role}</p>
                            
                            {/* Stats - Visual Bars */}
                            <div className="w-full space-y-1 mb-3 px-4">
                                <div className="flex justify-between text-xs text-stone-400">
                                    <span>Speed</span>
                                    <span className="text-white">{rat.stats.speed > 4 ? 'FAST' : rat.stats.speed < 3.5 ? 'SLOW' : 'AVG'}</span>
                                </div>
                                <div className="w-full h-1 bg-stone-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400" style={{ width: `${(rat.stats.speed / 6) * 100}%` }}></div>
                                </div>

                                <div className="flex justify-between text-xs text-stone-400 pt-1">
                                    <span>Stability</span>
                                    <span className="text-white">{rat.stats.stability > 1 ? 'HIGH' : 'LOW'}</span>
                                </div>
                                <div className="w-full h-1 bg-stone-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-400" style={{ width: `${(rat.stats.stability / 2.5) * 100}%` }}></div>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-stone-300 italic mb-2 h-16 overflow-hidden">{rat.description}</p>
                            
                            {/* Background Story (Visible only on hover or select) */}
                             <div className={`mt-2 text-xs text-stone-500 text-left border-t border-stone-700 pt-2 w-full transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-50'}`}>
                                {rat.history}
                            </div>
                        </div>
                    </div>
                  );
              })}
          </div>
      </div>

      {/* Controls & Start */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        <ul className="flex flex-wrap justify-center gap-4 text-sm text-stone-400 bg-stone-800/50 p-4 rounded-lg border border-stone-700">
          <li className="flex items-center gap-2"><span className="px-2 py-1 bg-stone-700 rounded text-amber-400 font-bold">WASD</span> Move</li>
          <li className="flex items-center gap-2"><span className="px-2 py-1 bg-stone-700 rounded text-amber-400 font-bold">SHIFT</span> Boost</li>
          <li className="flex items-center gap-2"><span className="px-2 py-1 bg-stone-700 rounded text-amber-400 font-bold">R-CLICK</span> Scent</li>
          <li className="flex items-center gap-2"><span className="px-2 py-1 bg-stone-700 rounded text-amber-400 font-bold">L-CLICK</span> Scratch</li>
        </ul>

        <button 
            onClick={handleStart}
            className="px-12 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-full text-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 uppercase tracking-widest"
        >
            DEPLOY {selectedRat.role.split(' ')[1]}
        </button>
      </div>
    </div>
  );
};

export default Intro;