import React from 'react';
import { useGameStore } from '../store';

const UI: React.FC = () => {
  const { trust, stamina, health, bananas, isScentMode, messages, timeLeft, minesFound, status, restartGame, gameOverReason, dangerLevel } = useGameStore();

  // Simple visual effect for scent mode on the UI layer
  const containerClass = isScentMode 
    ? "w-full h-full p-6 flex flex-col justify-between transition-all duration-500 backdrop-grayscale-[0.8] backdrop-blur-[2px]" 
    : "w-full h-full p-6 flex flex-col justify-between transition-all duration-500";

  // Standard Scent Vignette
  const vignetteClass = isScentMode
    ? "absolute inset-0 pointer-events-none radial-gradient-scent opacity-100 transition-opacity duration-500 z-10"
    : "absolute inset-0 pointer-events-none radial-gradient-scent opacity-0 transition-opacity duration-500 z-10";
    
  // Danger Vignette (Red Pulse)
  const dangerOpacity = dangerLevel * 0.8; // Max 0.8 opacity
  const dangerStyle = {
      background: `radial-gradient(circle, transparent 20%, rgba(255, 0, 0, ${dangerOpacity}) 90%)`,
  };

  // Format time as MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const timeColor = timeLeft < 10 ? "text-red-500 animate-pulse" : "text-stone-200";

  let gameOverTitle = 'FAILED';
  let gameOverSubtitle = 'Mission Failed';
  let gameOverMessage = 'Mission aborted.';

  if (gameOverReason === 'explosion') {
      gameOverTitle = 'K.I.A.';
      gameOverSubtitle = 'Detonation Detected';
      gameOverMessage = "You stepped on an active mine. The mission is over.";
  } else if (gameOverReason === 'timeout') {
      gameOverTitle = 'FAILED';
      gameOverSubtitle = 'Time Expired';
      gameOverMessage = "We failed to clear the area in time.";
  } else if (gameOverReason === 'health') {
      gameOverTitle = 'INJURED';
      gameOverSubtitle = 'Rat Injured';
      gameOverMessage = "You hurt yourself scratching sharp objects too many times.";
  }

  return (
    <>
      {/* CSS Vignette for Scent Mode */}
      <div className={vignetteClass} style={{ background: 'radial-gradient(circle, transparent 40%, rgba(20, 0, 30, 0.4) 100%)' }} />
      
      {/* CSS Vignette for DANGER */}
      <div className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-100" style={dangerStyle} />

      <div className={containerClass}>
        {/* Top Bar */}
        <div className="flex justify-between items-start pointer-events-auto relative z-30">
          {/* Left: Stats */}
          <div className="flex flex-col gap-4">
            
            {/* Health Bar */}
            <div className="flex flex-col gap-1">
              <div className="text-xs uppercase tracking-widest text-stone-400">Rat Health</div>
              <div className="w-64 h-3 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                <div 
                  className={`h-full transition-all duration-500 ${health < 30 ? 'bg-red-600' : 'bg-green-500'}`} 
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>

            {/* Trust Bar */}
            <div className="flex flex-col gap-1">
              <div className="text-xs uppercase tracking-widest text-stone-400">Trainer Trust</div>
              <div className="w-64 h-3 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                <div 
                  className={`h-full transition-all duration-500 ${trust < 30 ? 'bg-orange-600' : 'bg-amber-500'}`} 
                  style={{ width: `${trust}%` }}
                />
              </div>
            </div>

            {/* Stamina Bar */}
            <div className="flex flex-col gap-1">
              <div className="text-xs uppercase tracking-widest text-stone-400">Scent Stamina</div>
              <div className="w-64 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                <div 
                  className="h-full transition-all duration-200 bg-cyan-400" 
                  style={{ width: `${stamina}%` }}
                />
              </div>
            </div>
            
            <div className="bg-stone-900/80 backdrop-blur border border-stone-700 px-4 py-2 rounded-lg inline-flex items-center gap-3 mt-2">
                <span className="text-stone-400 text-xs uppercase tracking-widest">Objective</span>
                <span className="text-xl font-bold text-amber-400">{minesFound} / 30 <span className="text-stone-500 text-sm font-normal">Mines</span></span>
            </div>
          </div>

          {/* Center: Timer */}
          <div className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col items-center">
            <div className={`text-5xl font-mono font-bold tracking-wider drop-shadow-lg ${timeColor}`}>
                {timeString}
            </div>
            {/* DANGER WARNING TEXT */}
            {dangerLevel > 0.5 && (
                 <div className="mt-4 text-red-500 font-bold text-2xl animate-pulse tracking-[0.5em] drop-shadow-md">
                     DANGER
                 </div>
            )}
          </div>

          {/* Right: Rewards */}
          <div className="flex flex-col items-end">
            <div className="text-xs uppercase tracking-widest text-stone-400">Rewards</div>
            <div className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
              <span>🍌</span> {bananas}
            </div>
          </div>
        </div>

        {/* Center Feedback */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-2 z-20">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`px-4 py-2 rounded bg-black/50 backdrop-blur-sm text-lg font-medium animate-fade-in-up
                ${msg.type === 'success' ? 'text-green-400 border border-green-500/30' : 
                  msg.type === 'failure' ? 'text-red-400 border border-red-500/30' : 'text-stone-300'}
              `}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Bottom Instructions */}
        <div className="flex justify-center gap-8 text-sm font-mono text-stone-500 pointer-events-auto relative z-30">
          <div className={`transition-colors ${isScentMode ? 'text-violet-300 font-bold glow-violet' : ''}`}>
            [HOLD R-CLICK] SCENT: {isScentMode ? 'ON' : 'OFF'}
          </div>
          <div>[L-CLICK] SCRATCH</div>
        </div>
      </div>

      {/* GAME OVER OVERLAYS */}
      {status === 'won' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
             <img 
                src="https://res.cloudinary.com/dfbcjsw25/image/upload/v1763553286/unnamed_b4ovjj.jpg" 
                alt="Logo" 
                className="w-32 h-32 object-contain mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]"
            />
            <h1 className="text-6xl font-bold text-green-400 mb-4 tracking-tighter">MISSION ACCOMPLISHED</h1>
            <p className="text-stone-300 text-xl mb-8">The field is safe. Good boy.</p>
            <div className="flex items-center gap-4 text-2xl mb-12">
                <span className="text-yellow-400">🍌 {bananas} earned</span>
                <span className="text-stone-500">|</span>
                <span className="text-amber-500">Time: {timeString}</span>
            </div>
            <button 
                onClick={restartGame}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full text-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
                Play Again
            </button>
        </div>
      )}

      {status === 'lost' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in pointer-events-auto">
             <img 
                src="https://res.cloudinary.com/dfbcjsw25/image/upload/v1763553286/unnamed_b4ovjj.jpg" 
                alt="Logo" 
                className="w-32 h-32 object-contain mb-4 grayscale opacity-50"
            />
            <h1 className="text-8xl font-bold text-red-600 mb-2 tracking-tighter">
                {gameOverTitle}
            </h1>
            <h2 className="text-2xl font-bold text-stone-400 mb-6 uppercase tracking-widest">
                {gameOverSubtitle}
            </h2>
            <p className="text-stone-500 text-xl mb-8">
                {gameOverMessage}
            </p>
            <div className="flex items-center gap-4 text-2xl mb-12">
                <span className="text-stone-400">Mines Found: {minesFound} / 30</span>
            </div>
            <button 
                onClick={restartGame}
                className="px-8 py-3 bg-stone-600 hover:bg-stone-500 text-white font-bold rounded-full text-xl transition-all"
            >
                Try Again
            </button>
        </div>
      )}
    </>
  );
};

export default UI;