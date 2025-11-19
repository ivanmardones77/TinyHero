import React from 'react';
import { useGameStore } from '../store';

const UI: React.FC = () => {
  const { trust, stamina, health, bananas, isScentMode, messages, timeLeft, minesFound, status, restartGame, gameOverReason, dangerLevel, selectedRat } = useGameStore();

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
  const timeColor = timeLeft < 10 ? "text-red-500 animate-pulse" : "text-stone-100";

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
        <div className="flex justify-between items-start pointer-events-auto relative z-30 w-full">
          
          {/* Left: Stats Panel - Translucent Box */}
          <div className="bg-black/60 backdrop-blur-md border border-stone-600/50 p-5 rounded-2xl shadow-2xl flex flex-col gap-5 max-w-sm">
            
            {/* Header with Character Portrait */}
            <div className="flex items-center gap-3 pb-2 border-b border-stone-700/50">
                <img 
                    src={selectedRat.imageUrl} 
                    alt={selectedRat.name} 
                    className="w-14 h-14 object-cover drop-shadow-md rounded-full bg-stone-900 border border-stone-500"
                />
                <div>
                    <h2 className="text-stone-100 font-black text-lg leading-none tracking-tight shadow-black drop-shadow-sm uppercase">
                      {selectedRat.name}
                    </h2>
                    <span className="text-amber-500 text-xs font-bold tracking-widest">UNIT: {selectedRat.role}</span>
                </div>
            </div>

            {/* Health Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-300 drop-shadow-sm">
                <span>Health</span>
                <span className="text-stone-100">{Math.round(health)}%</span>
              </div>
              <div className="w-60 h-4 bg-stone-950 rounded-full overflow-hidden border border-stone-600 shadow-inner">
                <div 
                  className={`h-full transition-all duration-500 ${health < 30 ? 'bg-red-600' : 'bg-gradient-to-r from-green-600 to-green-400'}`} 
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>

            {/* Trust Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-300 drop-shadow-sm">
                 <span>Trust</span>
                 <span className="text-stone-100">{Math.round(trust)}%</span>
              </div>
              <div className="w-60 h-4 bg-stone-950 rounded-full overflow-hidden border border-stone-600 shadow-inner">
                <div 
                  className={`h-full transition-all duration-500 ${trust < 30 ? 'bg-orange-600' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`} 
                  style={{ width: `${trust}%` }}
                />
              </div>
            </div>

            {/* Stamina Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-300 drop-shadow-sm">
                <span>Stamina</span>
                <span className="text-stone-100">{Math.round(stamina)}%</span>
              </div>
              <div className="w-60 h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-600 shadow-inner">
                <div 
                  className="h-full transition-all duration-200 bg-gradient-to-r from-cyan-600 to-cyan-400" 
                  style={{ width: `${stamina}%` }}
                />
              </div>
            </div>
            
            {/* Objective */}
            <div className="mt-1 bg-stone-800/50 rounded-lg p-2 border border-stone-600/30 flex justify-between items-center">
                <span className="text-stone-300 text-xs font-bold uppercase tracking-widest">Mines Cleared</span>
                <span className="text-xl font-black text-amber-400 drop-shadow-md">{minesFound} <span className="text-stone-500 text-sm">/ 30</span></span>
            </div>
          </div>

          {/* Center: Timer */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2 flex flex-col items-center">
            <div className={`text-6xl font-mono font-black tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] ${timeColor}`}>
                {timeString}
            </div>
            {/* DANGER WARNING TEXT */}
            {dangerLevel > 0.5 && (
                 <div className="mt-2 text-red-500 font-black text-3xl animate-pulse tracking-[0.5em] drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] bg-black/40 px-6 py-2 rounded-lg border border-red-500/50">
                     DANGER
                 </div>
            )}
          </div>

          {/* Right: Rewards */}
          <div className="bg-black/60 backdrop-blur-md border border-stone-600/50 p-4 rounded-2xl shadow-xl flex flex-col items-end">
            <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-1 drop-shadow-sm">Rewards</div>
            <div className="text-3xl font-black text-yellow-400 flex items-center gap-2 drop-shadow-md">
              <span>🍌</span> {bananas}
            </div>
          </div>
        </div>

        {/* Center Feedback */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-2 z-20">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`px-6 py-3 rounded-xl bg-black/70 backdrop-blur-md text-xl font-bold animate-fade-in-up shadow-2xl border
                ${msg.type === 'success' ? 'text-green-400 border-green-500/50' : 
                  msg.type === 'failure' ? 'text-red-400 border-red-500/50' : 'text-stone-200 border-stone-600'}
              `}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Bottom Instructions */}
        <div className="flex justify-center gap-8 text-sm font-mono font-bold text-stone-400 pointer-events-auto relative z-30 bg-black/40 backdrop-blur-sm py-2 px-6 rounded-full border border-stone-700/50">
          <div className={`transition-colors drop-shadow-sm ${isScentMode ? 'text-violet-300 font-black glow-violet' : ''}`}>
            [HOLD R-CLICK] SCENT: {isScentMode ? 'ON' : 'OFF'}
          </div>
          <div className="text-stone-300 drop-shadow-sm">[L-CLICK] SCRATCH</div>
        </div>
      </div>

      {/* GAME OVER OVERLAYS */}
      {status === 'won' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
             <img 
                src={selectedRat.imageUrl}
                alt="Logo" 
                className="w-32 h-32 object-cover mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)] rounded-full border-4 border-green-500"
            />
            <h1 className="text-6xl font-black text-green-400 mb-4 tracking-tighter drop-shadow-lg">MISSION ACCOMPLISHED</h1>
            <p className="text-stone-200 text-2xl mb-8 font-bold">The field is safe. Good job, {selectedRat.name}.</p>
            <div className="flex items-center gap-6 text-3xl mb-12 bg-black/40 p-6 rounded-xl border border-green-900">
                <span className="text-yellow-400 font-black">🍌 {bananas} earned</span>
                <span className="text-stone-600">|</span>
                <span className="text-amber-500 font-bold">Time: {timeString}</span>
            </div>
            <button 
                onClick={restartGame}
                className="px-10 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-full text-2xl transition-all shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:scale-105"
            >
                Play Again
            </button>
        </div>
      )}

      {status === 'lost' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in pointer-events-auto">
             <img 
                src={selectedRat.imageUrl}
                alt="Logo" 
                className="w-32 h-32 object-cover mb-4 grayscale opacity-70 rounded-full border-4 border-stone-600"
            />
            <h1 className="text-8xl font-black text-red-600 mb-2 tracking-tighter drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">
                {gameOverTitle}
            </h1>
            <h2 className="text-3xl font-bold text-stone-400 mb-6 uppercase tracking-widest">
                {gameOverSubtitle}
            </h2>
            <p className="text-stone-300 text-xl mb-8 max-w-md text-center">
                {gameOverMessage}
            </p>
            <div className="flex items-center gap-4 text-2xl mb-12 bg-stone-900/80 p-4 rounded-lg border border-stone-800">
                <span className="text-stone-400 font-bold">Mines Found: {minesFound} / 30</span>
            </div>
            <button 
                onClick={restartGame}
                className="px-10 py-4 bg-stone-700 hover:bg-stone-600 text-white font-black rounded-full text-2xl transition-all shadow-xl hover:scale-105"
            >
                Try Again
            </button>
        </div>
      )}
    </>
  );
};

export default UI;