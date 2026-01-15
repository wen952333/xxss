import { useState, useCallback, useEffect } from 'react';
import { GamePhase, Player, HandFormation, Card } from '../types';
import { generateDeck, shuffleDeck } from '../utils/gameLogic';

const createMockFormation = (hand: Card[]): HandFormation => {
  const sorted = [...hand].sort((a, b) => a.rank - b.rank);
  return {
    front: sorted.slice(0, 3),
    middle: sorted.slice(3, 8),
    back: sorted.slice(8, 13)
  };
};

export const useGame = () => {
  const [gameState, setGameState] = useState<GamePhase>(GamePhase.Idle);
  const [players, setPlayers] = useState<Player[]>([]);
  const [userPlayerId] = useState('user-1');

  const startNewGame = useCallback(() => {
    setGameState(GamePhase.Dealing);
    const deck = shuffleDeck(generateDeck());
    
    // Deal 4 hands of 13 cards
    const hands: Card[][] = [[], [], [], []];
    for (let i = 0; i < 52; i++) {
        hands[i % 4].push(deck[i]);
    }

    const newPlayers: Player[] = [
        { id: userPlayerId, name: '你', isAi: false, hand: hands[0], score: 0 },
        { id: 'bot-1', name: '电脑 A', isAi: true, hand: hands[1], score: 0 },
        { id: 'bot-2', name: '电脑 B', isAi: true, hand: hands[2], score: 0 },
        { id: 'bot-3', name: '电脑 C', isAi: true, hand: hands[3], score: 0 },
    ];

    setPlayers(newPlayers);

    // Simulate dealing animation time
    setTimeout(() => {
        setGameState(GamePhase.Sorting);
    }, 1000);
  }, [userPlayerId]);

  const handleUserConfirm = useCallback((formation: HandFormation) => {
    setPlayers(prev => prev.map(p => {
        if (p.id === userPlayerId) {
            return { ...p, formation };
        }
        if (p.isAi) {
            return { ...p, formation: createMockFormation(p.hand) };
        }
        return p;
    }));
    setGameState(GamePhase.Revealing);
  }, [userPlayerId]);

  const exitGame = useCallback(() => {
    setGameState(GamePhase.Idle);
    setPlayers([]);
  }, []);

  const calculateScores = useCallback(() => {
    setPlayers(prevPlayers => {
        const scoredPlayers = prevPlayers.map(p => ({ ...p }));
        scoredPlayers.forEach(p => {
            p.score += Math.floor(Math.random() * 10) - 5;
        });
        return scoredPlayers;
    });
  }, []);

  // Auto-progress from Revealing to Result
  useEffect(() => {
    if (gameState === GamePhase.Revealing) {
        const timer = setTimeout(() => {
            calculateScores();
            setGameState(GamePhase.Result);
        }, 3000); 
        return () => clearTimeout(timer);
    }
  }, [gameState, calculateScores]);

  return {
    gameState,
    players,
    userPlayerId,
    startNewGame,
    handleUserConfirm,
    exitGame
  };
};