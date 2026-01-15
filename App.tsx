import React from 'react';
import { GamePhase, HandFormation } from './types';
import { HandSorter } from './components/HandSorter';
import { useGame } from './hooks/useGame';
import { GameHeader } from './components/GameHeader';
import { StartScreen } from './components/StartScreen';
import { PlayerResults } from './components/PlayerResults';
import { OpponentArea } from './components/OpponentArea';

const App: React.FC = () => {
  const { gameState, players, userPlayerId, startNewGame, handleUserConfirm, exitGame } = useGame();
  
  const userPlayer = players.find(p => p.id === userPlayerId);

  // Wrapper for "Submit and Next Round"
  const handleNextRound = (formation: HandFormation) => {
    handleUserConfirm(formation);
  };

  return (
    <div className="min-h-screen flex flex-col items-center relative font-sans bg-gray-100">
      <GameHeader gameState={gameState} />

      <main className="flex-1 w-full relative overflow-hidden flex flex-col">
        
        {gameState === GamePhase.Idle ? (
          <StartScreen onStart={startNewGame} />
        ) : (
          <div className="flex flex-col h-full bg-emerald-800 relative shadow-inner">
             {/* Table Texture Overlay */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 pointer-events-none z-0"></div>

             {/* Top Status Banner (Player State) */}
             <div className="w-full bg-emerald-900/90 backdrop-blur text-emerald-100 px-4 py-2 flex justify-between items-center border-b border-emerald-700/50 z-20 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-emerald-300 flex items-center justify-center text-emerald-800 font-bold shadow-sm">
                        我
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className="font-bold text-sm">{userPlayer?.name || 'Guest'}</span>
                        <span className="text-[10px] text-emerald-300">
                            {gameState === GamePhase.Sorting ? '请理牌' : '等待中'}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-end leading-tight">
                    <span className="text-[10px] text-emerald-400">当前积分</span>
                    <span className="text-lg font-bold text-yellow-400">{userPlayer?.score || 0}</span>
                </div>
             </div>
             
             {/* Opponent Area - Visible but compact at top */}
             <div className="relative z-10 w-full bg-emerald-900/20 pt-2 pb-2">
                 <OpponentArea players={players} gameState={gameState} />
             </div>

             {/* Main Game Interaction Area */}
             <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
               
               {gameState === GamePhase.Dealing && (
                  <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-white/90 backdrop-blur px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
                       <span className="text-3xl">🃏</span>
                       <span className="text-xl font-bold text-slate-800">正在发牌...</span>
                    </div>
                  </div>
               )}

               {gameState === GamePhase.Sorting && userPlayer && (
                 <HandSorter 
                   cards={userPlayer.hand} 
                   onConfirm={handleUserConfirm}
                   onExit={exitGame}
                   onNextRound={handleNextRound}
                 />
               )}

               {(gameState === GamePhase.Revealing || gameState === GamePhase.Result) && (
                 <div className="flex-1 flex items-center justify-center p-4 bg-emerald-900/30 backdrop-blur-sm">
                    <PlayerResults 
                       player={userPlayer} 
                       gameState={gameState} 
                       onRestart={startNewGame} 
                    />
                 </div>
               )}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;