
import { useState, useCallback, useEffect } from 'react';
import { GamePhase, Player, HandFormation, Card, Seat } from '../types';
import { getSmartRecommendations } from '../utils/gameLogic';
import { calculateFinalScores } from '../utils/scoringLogic';

const createRandomHand = (): Card[] => [];

export const useGame = () => {
  const [gameState, setGameState] = useState<GamePhase>(GamePhase.Idle);
  const [players, setPlayers] = useState<Player[]>([]);
  // Use a random temporary ID if not logged in, to allow basic testing without auth
  const [userPlayerId] = useState(() => {
     const stored = localStorage.getItem('thirteen_temp_id');
     if (stored) return stored;
     const newId = `guest-${Math.floor(Math.random() * 100000)}`;
     localStorage.setItem('thirteen_temp_id', newId);
     return newId;
  });
  const [currentSeat, setCurrentSeat] = useState<Seat | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<number>(1);
  const [currentGameId, setCurrentGameId] = useState<number>(0);
  const [waitingMessage, setWaitingMessage] = useState<string | null>(null);

  // Poll for room status if waiting
  const pollForStart = async (roomId: number, seat: Seat, userId: string) => {
    try {
        // Convert string ID to number for DB if possible, or hash it. 
        // Simple hack: if guest-XXXX, use XXXX. If real user ID, use it.
        const numericId = userId.startsWith('guest-') ? parseInt(userId.split('-')[1]) : (parseInt(userId) || 9999);

        const res = await fetch('/api/game-stage', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'start_stage', userId: numericId, roomId, seat })
        });
        const data = await res.json();
        
        if (data.success) {
            setWaitingMessage(null);
            return true;
        } else if (data.error === 'WAITING_FOR_PLAYERS') {
            setWaitingMessage(data.message);
            return false;
        } else {
            console.error(data.error); // Log but don't alert constantly
            return false;
        }
    } catch(e) { console.error(e); return false; }
  };

  const startNewGame = useCallback(async (selectedSeat?: Seat, selectedRoomId?: number) => {
    if (selectedSeat) {
        setCurrentSeat(selectedSeat);
        if (selectedRoomId) setCurrentRoomId(selectedRoomId);
        
        const roomIdToUse = selectedRoomId || currentRoomId;
        const seatToUse = selectedSeat;
        const numericId = userPlayerId.startsWith('guest-') ? parseInt(userPlayerId.split('-')[1]) : (parseInt(userPlayerId) || 9999);

        // 1. Join Room (Occupy Seat)
        try {
            const joinRes = await fetch('/api/game-stage', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'join_room', userId: numericId, roomId: roomIdToUse, seat: seatToUse })
            });
            const joinData = await joinRes.json();
            if (!joinData.success) {
                alert(joinData.error || "加入房间失败");
                return;
            }
        } catch(e) {
            console.error("Join room error", e);
            alert("网络连接失败");
            return;
        }

        // 2. Initial Check
        const ready = await pollForStart(roomIdToUse, seatToUse, userPlayerId);
        if (!ready) {
             // START POLLING
             // We need a way to stop this interval when game starts. 
             // Ideally use a useEffect, but for this structure we'll set a flag or rely on user re-clicking.
             // For better UX, let's just keep the waiting state and use a useEffect in StartScreen to poll.
             return; 
        }
    }

    setGameState(GamePhase.Dealing);
    setWaitingMessage(null);
    
    // 3. Fetch Hand
    const numericId = userPlayerId.startsWith('guest-') ? parseInt(userPlayerId.split('-')[1]) : (parseInt(userPlayerId) || 9999);
    try {
        const res = await fetch('/api/game-stage', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'get_hand', userId: numericId, seat: selectedSeat || currentSeat, roomId: selectedRoomId || currentRoomId })
        });
        
        if (!res.ok) {
             throw new Error("Server error");
        }

        const data = await res.json();
        
        if (data.success) {
            setCurrentGameId(data.gameId);
            const userHand: Card[] = data.hand;
            const seatOrder = [Seat.North, Seat.East, Seat.South, Seat.West];
            const getPlayerForSeat = (seat: Seat, isUser: boolean) => ({
                id: isUser ? userPlayerId : `player-${seat}`,
                name: isUser ? '你' : `玩家 ${seat}`,
                isAi: false, // All considered real players now, though we don't have their data
                hand: isUser ? userHand : createRandomHand(), // Others are hidden anyway
                score: 0,
                seat: seat
            });

            const mySeat = selectedSeat || currentSeat || Seat.North;
            const newPlayers: Player[] = seatOrder.map(s => getPlayerForSeat(s, s === mySeat));

            setPlayers(newPlayers);
            setTimeout(() => {
                setGameState(GamePhase.Sorting);
            }, 800);
        } else {
            alert(data.error || "获取手牌失败");
            setGameState(GamePhase.Idle);
        }
    } catch (e) {
        console.error("Network error", e);
        alert("游戏启动失败");
        setGameState(GamePhase.Idle);
    }

  }, [userPlayerId, currentSeat, currentRoomId]);

  const handleUserConfirm = useCallback(async (formation: HandFormation) => {
    setPlayers(prev => prev.map(p => {
        if (p.id === userPlayerId) return { ...p, formation };
        return p;
    }));
    
    setGameState(GamePhase.Revealing);

    const numericId = userPlayerId.startsWith('guest-') ? parseInt(userPlayerId.split('-')[1]) : (parseInt(userPlayerId) || 9999);

    try {
        const res = await fetch('/api/game-stage', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'submit_result', userId: numericId, gameId: currentGameId })
        });
        const data = await res.json();

        if (data.success && data.hands) {
            setPlayers(prev => {
                const updatedPlayers = prev.map(p => {
                    // Fill in data for other players
                    if (p.seat && p.seat !== currentSeat) {
                        const rawHand: Card[] = data.hands[p.seat];
                        // Auto-sort for opponents (visual only)
                        const recommendations = getSmartRecommendations(rawHand);
                        const bestFormation = recommendations.length > 0 ? recommendations[0] : {
                            front: rawHand.slice(0,3), middle: rawHand.slice(3,8), back: rawHand.slice(8,13)
                        };
                        return { ...p, hand: rawHand, formation: bestFormation };
                    }
                    return p;
                });
                const scores = calculateFinalScores(updatedPlayers);
                return updatedPlayers.map(p => ({
                    ...p,
                    score: scores[p.id] || 0
                }));
            });
            setTimeout(() => {
                setGameState(GamePhase.Result);
            }, 3000);
        }
    } catch (e) {
        console.error("Error submitting result", e);
    }

  }, [userPlayerId, currentGameId, currentSeat]);

  const exitGame = useCallback(() => {
    setGameState(GamePhase.Idle);
    setPlayers([]);
    setCurrentSeat(null);
    setWaitingMessage(null);
  }, []);

  return {
    gameState,
    players,
    userPlayerId,
    startNewGame, 
    handleUserConfirm,
    exitGame,
    currentGameId,
    waitingMessage 
  };
};
