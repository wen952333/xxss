import React from 'react';
import { GamePhase } from '../types';

interface GameHeaderProps {
  gameState: GamePhase;
}

export const GameHeader: React.FC<GameHeaderProps> = () => {
  return (
    <header className="w-full bg-white shadow-sm flex justify-between items-center px-4 py-2 h-14 z-50 border-b border-gray-200">
      
      {/* Left: Login/Register */}
      <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition">
        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <span className="text-sm font-bold text-gray-600">登录 / 注册</span>
      </div>

      {/* Center: Match History */}
      <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-4 py-1 rounded transition">
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        <span className="text-sm font-bold text-gray-700">我的战绩</span>
      </div>

      {/* Right: Credits Management */}
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
        <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-yellow-900 font-bold">$</div>
        <span className="text-sm font-bold text-gray-700">1,000</span>
        <button className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-green-600 shadow-sm ml-1">
          +
        </button>
      </div>
    </header>
  );
};