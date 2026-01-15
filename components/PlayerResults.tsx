import React from 'react';
import { Player, GamePhase } from '../types';
import { CardComponent } from './CardComponent';

interface PlayerResultsProps {
  player?: Player;
  gameState: GamePhase;
  onRestart: () => void;
}

export const PlayerResults: React.FC<PlayerResultsProps> = ({ player, gameState, onRestart }) => {
  if (!player?.formation) return null;

  return (
    <div className="flex flex-col items-center bg-emerald-950/80 p-6 rounded-2xl backdrop-blur-md border border-emerald-600/50 shadow-2xl max-w-lg w-full">
      <h2 className="text-xl font-bold mb-6 text-emerald-100 flex items-center gap-2">
         <span className="text-2xl">🏆</span> 结算
      </h2>
      
      <div className="flex flex-col w-full gap-4">
        {/* Front */}
        <div className="flex items-center justify-between bg-emerald-900/50 p-2 rounded-lg border border-emerald-800">
           <span className="text-xs uppercase font-bold text-emerald-400 w-12">前墩</span>
           <div className="flex -space-x-2">
             {player.formation.front.map(c => <CardComponent key={c.id} card={c} small />)}
           </div>
           <div className="w-8 text-center text-emerald-200 text-sm font-mono">-</div>
        </div>

        {/* Middle */}
        <div className="flex items-center justify-between bg-emerald-900/50 p-2 rounded-lg border border-emerald-800">
           <span className="text-xs uppercase font-bold text-emerald-400 w-12">中墩</span>
           <div className="flex -space-x-2">
             {player.formation.middle.map(c => <CardComponent key={c.id} card={c} small />)}
           </div>
           <div className="w-8 text-center text-emerald-200 text-sm font-mono">-</div>
        </div>

        {/* Back */}
        <div className="flex items-center justify-between bg-emerald-900/50 p-2 rounded-lg border border-emerald-800">
           <span className="text-xs uppercase font-bold text-emerald-400 w-12">后墩</span>
           <div className="flex -space-x-2">
             {player.formation.back.map(c => <CardComponent key={c.id} card={c} small />)}
           </div>
           <div className="w-8 text-center text-emerald-200 text-sm font-mono">-</div>
        </div>
      </div>
      
      {gameState === GamePhase.Result && (
        <div className="mt-8 flex flex-col items-center w-full border-t border-emerald-800 pt-4">
          <div className="text-sm text-emerald-300 mb-1">本局收益</div>
          <div className={`text-4xl font-black mb-6 ${player.score >= 0 ? "text-yellow-400 drop-shadow-md" : "text-gray-400"}`}>
            {player.score >= 0 ? "+" : ""}{player.score}
          </div>
          <button 
            onClick={onRestart}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold rounded-lg shadow-lg transform transition active:scale-95"
          >
            下一局
          </button>
        </div>
      )}
    </div>
  );
};