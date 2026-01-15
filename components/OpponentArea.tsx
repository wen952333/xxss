import React from 'react';
import { Player, GamePhase } from '../types';
import { CardComponent } from './CardComponent';

interface OpponentAreaProps {
  players: Player[];
  gameState: GamePhase;
}

export const OpponentArea: React.FC<OpponentAreaProps> = ({ players, gameState }) => {
  const bots = players.filter(p => p.isAi);

  return (
    <div className="flex justify-around items-start w-full px-2">
      {bots.map((bot) => (
        <div key={bot.id} className="flex flex-col items-center group">
          <div className="relative">
             <div className="w-10 h-10 bg-emerald-950 rounded-full flex items-center justify-center mb-1 border-2 border-emerald-700 shadow-md z-10 relative">
               <span className="text-lg">🤖</span>
             </div>
             {gameState === GamePhase.Result && (
                <div className={`absolute -top-1 -right-1 text-xs font-bold px-1.5 rounded-full border border-white/20 shadow-sm z-20 ${bot.score >= 0 ? 'bg-red-500 text-white' : 'bg-slate-500 text-white'}`}>
                  {bot.score >= 0 ? '+' : ''}{bot.score}
                </div>
             )}
          </div>
          <span className="text-[10px] text-emerald-200 mb-1 font-medium bg-black/20 px-2 rounded-full">{bot.name}</span>
          
          <div className="flex -space-x-8 md:-space-x-10 scale-75 md:scale-90 origin-top">
            {/* Show simplified back of cards */}
            {gameState === GamePhase.Revealing || gameState === GamePhase.Result ? (
              // Revealed hands (simplified view)
              <div className="flex flex-col gap-1">
                 {/* Just show a summary or small representation. 
                     For full detail, we might need a better view, but for now stack them. */}
                <div className="flex -space-x-4">
                  {bot.formation?.front.map((c, i) => <CardComponent key={`f-${i}`} card={c} small />)}
                </div>
                <div className="flex -space-x-4">
                  {bot.formation?.middle.map((c, i) => <CardComponent key={`m-${i}`} card={c} small />)}
                </div>
                <div className="flex -space-x-4">
                  {bot.formation?.back.map((c, i) => <CardComponent key={`b-${i}`} card={c} small />)}
                </div>
              </div>
            ) : (
              // Face down - Just show 13 card backs stacked or a generic "Hand" icon
              <div className="flex -space-x-3">
                 <div className="w-8 h-10 bg-blue-900 border border-blue-400 rounded shadow-sm"></div>
                 <div className="w-8 h-10 bg-blue-900 border border-blue-400 rounded shadow-sm"></div>
                 <div className="w-8 h-10 bg-blue-900 border border-blue-400 rounded shadow-sm"></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};