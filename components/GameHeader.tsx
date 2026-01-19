import React from 'react';
import { GamePhase, User } from '../types';

interface GameHeaderProps {
  gameState: GamePhase;
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onCreditClick: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ gameState, user, onLoginClick, onLogoutClick, onCreditClick }) => {
  return (
    <header className="w-full bg-gray-100 shadow-sm flex justify-between items-center px-4 py-2 h-14 z-50 border-b border-gray-200">
      
      {/* Left: Login/Logout */}
      {!user ? (
        <div 
          onClick={onLoginClick}
          className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded transition"
        >
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <span className="text-sm font-bold text-gray-600">登录 / 注册</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full flex items-center justify-center font-bold text-xs shadow-sm bg-white">
                    {user.nickname[0]}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800">{user.nickname}</span>
                    <span className="text-[10px] text-gray-400">已登录</span>
                </div>
             </div>
             <button 
                onClick={onLogoutClick}
                className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-red-100 bg-white shadow-sm"
             >
                退出
             </button>
        </div>
      )}

      {/* Right: Credits Management */}
      <div 
        onClick={user ? onCreditClick : onLoginClick}
        className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-200 cursor-pointer hover:bg-gray-50 transition shadow-sm"
      >
        <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-yellow-900 font-bold">$</div>
        <span className="text-sm font-bold text-gray-700">{user ? user.credits : 0}</span>
        <button className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-green-600 shadow-sm ml-1">
          +
        </button>
      </div>
    </header>
  );
};