
import { useState, useCallback, useEffect } from 'react';
import { GamePhase, Player, HandFormation, Card, Seat } from '../types';
import { getSmartRecommendations } from '../utils/gameLogic';
import { calculateFinalScores } from '../utils/scoringLogic';

// Mock function for bots since we only fetch User hand from API
// In a real version, we might fetch bot hands after result is shown
const createRandomHand = (): Card[] => {
   return []; 
};

export const useGame = () => {
  const [gameState, setGameState] = useState<GamePhase>(GamePhase.Idle);
  const [players, setPlayers] = useState<Player[]>([]);
  const [userPlayerId] = useState('user-1');
  const [currentSeat, setCurrentSeat] = useState<Seat | null>(null);
  const [currentGameId, setCurrentGameId] = useState<number>(0);

  const startNewGame = useCallback(async (selectedSeat?: Seat) => {
    // If starting fresh from Lobby
    if (selectedSeat) {
        setCurrentSeat(selectedSeat);
        
        // 1. Init Stage (Refill inventory, shuffle sequence)
        try {
            await fetch('/api/game-stage', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'start_stage', userId: 123, roomId: 1, seat: selectedSeat })
            });
        } catch(e) { console.error(e); }
    }

    setGameState(GamePhase.Dealing);
    
    // 2. Fetch the specific hand for this turn
    try {
        const res = await fetch('/api/game-stage', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'get_hand', userId: 123, seat: selectedSeat || currentSeat })
        });
        const data = await res.json();
        
        if (data.success) {
            setCurrentGameId(data.gameId);
            
            // Construct Players
            const userHand: Card[] = data.hand;
            
            // Define seat order N -> E -> S -> W
            const seatOrder = [Seat.North, Seat.East, Seat.South, Seat.West];
            
            // Helper to get relative seat index
            const getPlayerForSeat = (seat: Seat, isUser: boolean) => ({
                id: isUser ? userPlayerId : `bot-${seat}`,
                name: isUser ? '你' : `电脑 ${seat}`,
                isAi: !isUser,
                hand: isUser ? userHand : createRandomHand(), // Bot hands hidden initially
                score: 0,
                seat: seat
            });

            const mySeat = selectedSeat || currentSeat || Seat.North;
            
            // Create list of 4 players, placing User in correct slot conceptually, 
            // but for UI usually User is "Main". 
            // Let's keep the array order consistent with seat order for scoring ease.
            const newPlayers: Player[] = seatOrder.map(s => getPlayerForSeat(s, s === mySeat));

            setPlayers(newPlayers);
            
            // Move to sorting
            setTimeout(() => {
                setGameState(GamePhase.Sorting);
            }, 800);
        } else {
            alert("阶段完成或获取手牌失败");
            setGameState(GamePhase.Idle);
        }
    } catch (e) {
        console.error("Network error", e);
        setGameState(GamePhase.Idle);
    }

  }, [userPlayerId, currentSeat]);

  const handleUserConfirm = useCallback(async (formation: HandFormation) => {
    // 1. Optimistic Update (User)
    setPlayers(prev => prev.map(p => {
        if (p.id === userPlayerId) return { ...p, formation };
        return p;
    }));
    
    setGameState(GamePhase.Revealing);

    // 2. Submit & Get Opponent Hands
    try {
        const res = await fetch('/api/game-stage', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'submit_result', userId: 123, gameId: currentGameId })
        });
        const data = await res.json();

        if (data.success && data.hands) {
            // 3. Update Bots with Real Hands & Smart Sort them
            setPlayers(prev => {
                const updatedPlayers = prev.map(p => {
                    if (p.isAi && p.seat) {
                        const rawHand: Card[] = data.hands[p.seat];
                        // Auto-sort bot hand
                        const recommendations = getSmartRecommendations(rawHand);
                        const bestFormation = recommendations.length > 0 ? recommendations[0] : {
                            front: rawHand.slice(0,3), middle: rawHand.slice(3,8), back: rawHand.slice(8,13)
                        };
                        return { ...p, hand: rawHand, formation: bestFormation };
                    }
                    return p; // User is already updated
                });
                
                // 4. Calculate Scores Immediately
                const scores = calculateFinalScores(updatedPlayers);
                
                return updatedPlayers.map(p => ({
                    ...p,
                    score: scores[p.id] || 0
                }));
            });
            
            // Transition to Result view after reveal animation
            setTimeout(() => {
                setGameState(GamePhase.Result);
            }, 3000);

        }
    } catch (e) {
        console.error("Error submitting result", e);
    }

  }, [userPlayerId, currentGameId]);

  const exitGame = useCallback(() => {
    setGameState(GamePhase.Idle);
    setPlayers([]);
    setCurrentSeat(null);
  }, []);

  return {
    gameState,
    players,
    userPlayerId,
    startNewGame, 
    handleUserConfirm,
    exitGame,
    currentGameId
  };
};
