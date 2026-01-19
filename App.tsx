
import React, { useState, useEffect } from 'react';
import { GamePhase, HandFormation, User } from './types';
import { HandSorter } from './components/HandSorter';
import { useGame } from './hooks/useGame';
import { GameHeader } from './components/GameHeader';
import { StartScreen } from './components/StartScreen';
import { PlayerResults } from './components/PlayerResults';
import { OpponentArea } from './components/OpponentArea';
import { AuthModal } from './components/AuthModal';
import { CreditModal } from './components/CreditModal';

const App: React.FC = () => {
  const { gameState, players, userPlayerId, startNewGame, handleUserConfirm, exitGame, waitingMessage } = useGame();
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Restore user from session storage or check refresh token on load
  useEffect(() => {
    const storedUser = localStorage.getItem('thirteen_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        // Refresh latest credits
        fetch('/api/user', {
             method: 'POST', 
             headers: {'Content-Type': 'application/json'},
             body: JSON.stringify({ action: 'refresh', phone: user.phone }) 
        }).then(r => r.json()).then(data => {
            if(data.success) {
                setCurrentUser(data.user);
                localStorage.setItem('thirteen_user', JSON.stringify(data.user));
            }
        }).catch(() => {});
      } catch (e) {}
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('thirteen_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('thirteen_user');
  };

  const handleUpdateCredits = (newBalance: number) => {
    if (currentUser) {
        const updated = { ...currentUser, credits: newBalance };
        setCurrentUser(updated);
        localStorage.setItem('thirteen_user', JSON.stringify(updated));
    }
  };

  // Sync game player name with logged in user
  const userPlayer = players.find(p => p.id === userPlayerId);
  if (userPlayer && currentUser && userPlayer.name !== currentUser.nickname) {
      userPlayer.name = currentUser.nickname;
  }

  // Wrapper for "Submit and Next Round"
  const handleNextRound = (formation: HandFormation) => {
    handleUserConfirm(formation);
  };

  return (
    <div className="h-screen w-full flex flex-col items-center relative font-sans bg-gray-100 overflow-hidden">
      <GameHeader 
        gameState={gameState} 
        user={currentUser}
        onLoginClick={() => setShowAuthModal(true)}
        onLogoutClick={handleLogout}
        onCreditClick={() => setShowCreditModal(true)}
      />

      <main className="flex-1 w-full relative overflow-hidden flex flex-col">
        
        {gameState === GamePhase.Idle ? (
          <StartScreen 
            waitingMessage={waitingMessage}
            onStart={(seat, roomId) => {
              if(!currentUser) {
                  setShowAuthModal(true);
              } else {
                  startNewGame(seat, roomId);
              }
            }} 
          />
        ) : (
          <div className="flex flex-col h-full bg-emerald-800 relative shadow-inner">
             {/* Table Texture Overlay */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 pointer-events-none z-0"></div>

             {/* Top Status Banner (Player State) */}
             <div className="w-full bg-emerald-900/90 backdrop-blur text-emerald-100 px-4 py-1 flex justify-between items-center border-b border-emerald-700/50 z-20 shadow-md shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-300 flex items-center justify-center text-emerald-800 font-bold shadow-sm text-xs">
                        {currentUser ? currentUser.nickname[0] : '我'}
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className="font-bold text-xs">{currentUser?.nickname || 'Guest'}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end leading-tight">
                    <span className="text-[10px] text-emerald-400">本局积分</span>
                    <span className="text-base font-bold text-yellow-400">{userPlayer?.score || 0}</span>
                </div>
             </div>
             
             {/* Opponent Area */}
             <div className="relative z-10 w-full bg-emerald-900/20 pt-1 pb-1 shrink-0">
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
                       onRestart={() => startNewGame()} 
                    />
                 </div>
               )}
             </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onLoginSuccess={handleLoginSuccess} 
        />
      )}

      {showCreditModal && currentUser && (
        <CreditModal 
          currentUser={currentUser}
          onClose={() => setShowCreditModal(false)}
          onUpdateCredits={handleUpdateCredits}
        />
      )}
    </div>
  );
};

export default App;
