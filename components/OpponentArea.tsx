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
    <div className="flex justify-around items-start w-full px-2 pt-2">
      {bots.map((bot) => (
        <div key={bot.id} className="flex flex-col items-center group">
          {/* Only display Name and Score */}
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs text-emerald-200 font-bold drop-shadow-md">{bot.name}</span>
             {gameState === GamePhase.Result && (
                 <span className={`text-[10px] font-bold ${bot.score >= 0 ? 'text-yellow-400' : 'text-slate-300'}`}>
                    {bot.score >= 0 ? '+' : ''}{bot.score}
                 </span>
             )}
          </div>
          
          <div className="flex -space-x-6 md:-space-x-8 scale-90 origin-top">
            {/* 
                Only show cards if they are revealed.
                Hidden cards (blue boxes) are removed as requested.
            */}
            {(gameState === GamePhase.Revealing || gameState === GamePhase.Result) && bot.formation ? (
              <div className="flex flex-col gap-1">
                <div className="flex -space-x-4">
                  {bot.formation.front.map((c, i) => <CardComponent key={`f-${i}`} card={c} small />)}
                </div>
                <div className="flex -space-x-4">
                  {bot.formation.middle.map((c, i) => <CardComponent key={`m-${i}`} card={c} small />)}
                </div>
                <div className="flex -space-x-4">
                  {bot.formation.back.map((c, i) => <CardComponent key={`b-${i}`} card={c} small />)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};