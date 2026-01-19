
import { Card, Rank, Suit, HandFormation, Player, Seat } from '../types';

// Hand Types Rank (Higher is better)
export enum HandType {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8
}

interface EvaluatedHand {
  type: HandType;
  values: number[]; // Used for tie-breaking (e.g., [14, 10] for Pair of Aces with 10 kicker)
}

// Helper: Sort by rank descending
const sortCards = (cards: Card[]) => [...cards].sort((a, b) => b.rank - a.rank);

const isFlush = (cards: Card[]) => cards.every(c => c.suit === cards[0].suit);

const isStraight = (cards: Card[]) => {
  if (cards.length < 3) return false;
  // Handle Ace special case for A-2-3-4-5 (A=14, 2=2)
  // Logic: check normal straight first
  const sorted = sortCards(cards);
  let isSeq = true;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].rank !== sorted[i+1].rank + 1) {
      isSeq = false;
      break;
    }
  }
  if (isSeq) return true;

  // Check Wheel (A, 5, 4, 3, 2)
  if (sorted[0].rank === Rank.Ace) {
    const wheelCheck = sorted.slice(1); // 5,4,3,2
    if (wheelCheck.length === 4 && 
        wheelCheck[0].rank === Rank.Five && 
        wheelCheck[1].rank === Rank.Four && 
        wheelCheck[2].rank === Rank.Three && 
        wheelCheck[3].rank === Rank.Two) {
      return true;
    }
  }
  return false;
};

const getCounts = (cards: Card[]) => {
  const counts: Record<number, number> = {};
  cards.forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);
  return counts;
};

// Evaluate a generic 3 or 5 card hand
export const evaluateHand = (cards: Card[], isFront: boolean = false): EvaluatedHand => {
  const sorted = sortCards(cards);
  const counts = getCounts(sorted);
  const ranks = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a] || b - a); // Sort by count desc, then rank desc

  const isF = !isFront && cards.length === 5 && isFlush(sorted);
  const isS = !isFront && cards.length === 5 && isStraight(sorted);

  // Straight Flush
  if (isF && isS) return { type: HandType.StraightFlush, values: ranks };
  
  // Quads
  if (counts[ranks[0]] === 4) return { type: HandType.FourOfAKind, values: ranks };
  
  // Full House
  if (counts[ranks[0]] === 3 && counts[ranks[1]] >= 2) return { type: HandType.FullHouse, values: ranks };
  
  // Flush
  if (isF) return { type: HandType.Flush, values: sorted.map(c => c.rank) };
  
  // Straight
  if (isS) {
     // Handle Wheel Straight Value (5 is high)
     if (sorted[0].rank === Rank.Ace && sorted[1].rank === Rank.Five) {
        return { type: HandType.Straight, values: [5, 4, 3, 2, 1] }; // Symbolic
     }
     return { type: HandType.Straight, values: sorted.map(c => c.rank) };
  }

  // Three of a Kind
  if (counts[ranks[0]] === 3) return { type: HandType.ThreeOfAKind, values: ranks };
  
  // Two Pair
  if (counts[ranks[0]] === 2 && counts[ranks[1]] === 2) return { type: HandType.TwoPair, values: ranks };
  
  // One Pair
  if (counts[ranks[0]] === 2) return { type: HandType.OnePair, values: ranks };
  
  // High Card
  return { type: HandType.HighCard, values: sorted.map(c => c.rank) };
};

// Compare two hands. Returns 1 if A wins, -1 if B wins, 0 if tie.
export const compareHands = (handA: Card[], handB: Card[], isFront: boolean): number => {
  const evalA = evaluateHand(handA, isFront);
  const evalB = evaluateHand(handB, isFront);

  if (evalA.type > evalB.type) return 1;
  if (evalA.type < evalB.type) return -1;

  // Compare values
  for (let i = 0; i < evalA.values.length; i++) {
    if (evalA.values[i] > evalB.values[i]) return 1;
    if (evalA.values[i] < evalB.values[i]) return -1;
  }
  return 0;
};

// Main Scoring Function
// Returns map of PlayerID -> Score Change
export const calculateFinalScores = (players: Player[]): Record<string, number> => {
  const scores: Record<string, number> = {};
  players.forEach(p => scores[p.id] = 0);

  // Compare every pair of players
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const pA = players[i];
      const pB = players[j];

      if (!pA.formation || !pB.formation) continue;

      let scoreA = 0;
      let scoreB = 0;

      // 1. Front vs Front
      const resFront = compareHands(pA.formation.front, pB.formation.front, true);
      scoreA += resFront;
      scoreB -= resFront;

      // 2. Middle vs Middle
      const resMid = compareHands(pA.formation.middle, pB.formation.middle, false);
      // Middle Bonus (e.g., Full House in Middle often +2 in some variants, stick to +1 standard for now unless specified)
      scoreA += resMid;
      scoreB -= resMid;

      // 3. Back vs Back
      const resBack = compareHands(pA.formation.back, pB.formation.back, false);
      scoreA += resBack;
      scoreB -= resBack;

      // TODO: Add "Scooping" (Winning all 3 lanes) logic if desired (+3 bonus)
      // For now, simple additive

      scores[pA.id] += scoreA;
      scores[pB.id] += scoreB;
    }
  }
  return scores;
};
