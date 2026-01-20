
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
  values: number[]; // Used for tie-breaking
}

// Helper: Sort by rank descending
const sortCards = (cards: Card[]) => [...cards].sort((a, b) => b.rank - a.rank);

const isFlush = (cards: Card[]) => cards.every(c => c.suit === cards[0].suit);

const isStraight = (cards: Card[]) => {
  if (cards.length < 3) return false;
  const sorted = sortCards(cards);
  let isSeq = true;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].rank !== sorted[i+1].rank + 1) {
      isSeq = false;
      break;
    }
  }
  if (isSeq) return true;

  // Wheel (A, 5, 4, 3, 2)
  if (sorted[0].rank === Rank.Ace) {
    const wheelCheck = sorted.slice(1);
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

// Evaluate Hand
export const evaluateHand = (cards: Card[], isFront: boolean = false): EvaluatedHand => {
  const sorted = sortCards(cards);
  const counts = getCounts(sorted);
  const ranks = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a] || b - a);

  const isF = !isFront && cards.length === 5 && isFlush(sorted);
  const isS = !isFront && cards.length === 5 && isStraight(sorted);

  if (isF && isS) return { type: HandType.StraightFlush, values: ranks };
  if (counts[ranks[0]] === 4) return { type: HandType.FourOfAKind, values: ranks };
  if (counts[ranks[0]] === 3 && counts[ranks[1]] >= 2) return { type: HandType.FullHouse, values: ranks };
  if (isF) return { type: HandType.Flush, values: sorted.map(c => c.rank) };
  if (isS) {
     if (sorted[0].rank === Rank.Ace && sorted[1].rank === Rank.Five) {
        return { type: HandType.Straight, values: [5, 4, 3, 2, 1] };
     }
     return { type: HandType.Straight, values: sorted.map(c => c.rank) };
  }
  if (counts[ranks[0]] === 3) return { type: HandType.ThreeOfAKind, values: ranks };
  if (counts[ranks[0]] === 2 && counts[ranks[1]] === 2) return { type: HandType.TwoPair, values: ranks };
  if (counts[ranks[0]] === 2) return { type: HandType.OnePair, values: ranks };
  return { type: HandType.HighCard, values: sorted.map(c => c.rank) };
};

// Compare: 1 (A wins), -1 (B wins), 0 (Tie)
export const compareHands = (handA: Card[], handB: Card[], isFront: boolean): number => {
  const evalA = evaluateHand(handA, isFront);
  const evalB = evaluateHand(handB, isFront);

  if (evalA.type > evalB.type) return 1;
  if (evalA.type < evalB.type) return -1;
  for (let i = 0; i < evalA.values.length; i++) {
    if (evalA.values[i] > evalB.values[i]) return 1;
    if (evalA.values[i] < evalB.values[i]) return -1;
  }
  return 0;
};

// Get Bonus Points for Special Hands
const getBonusPoints = (cards: Card[], isFront: boolean, isMiddle: boolean): number => {
    const evalH = evaluateHand(cards, isFront);
    
    // Front: Three of a Kind (+3)
    if (isFront && evalH.type === HandType.ThreeOfAKind) return 3;
    
    // Middle: Full House (+2), Four of a Kind (+8), Straight Flush (+10)
    if (isMiddle) {
        if (evalH.type === HandType.FullHouse) return 2;
        if (evalH.type === HandType.FourOfAKind) return 8;
        if (evalH.type === HandType.StraightFlush) return 10;
    }
    
    // Back: Four of a Kind (+4), Straight Flush (+5)
    if (!isFront && !isMiddle) {
        if (evalH.type === HandType.FourOfAKind) return 4;
        if (evalH.type === HandType.StraightFlush) return 5;
    }
    
    return 0;
};

// Main Scoring Function
export const calculateFinalScores = (players: Player[]): Record<string, number> => {
  const scores: Record<string, number> = {};
  players.forEach(p => scores[p.id] = 0);

  // Compare every pair
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const pA = players[i];
      const pB = players[j];

      if (!pA.formation || !pB.formation) continue;

      let rawScoreA = 0;
      let rawScoreB = 0;
      
      let winsA = 0;
      let winsB = 0;

      // 1. Front
      const resFront = compareHands(pA.formation.front, pB.formation.front, true);
      if (resFront > 0) {
          winsA++;
          rawScoreA += 1 + getBonusPoints(pA.formation.front, true, false);
          rawScoreB -= 1 + getBonusPoints(pA.formation.front, true, false);
      } else if (resFront < 0) {
          winsB++;
          rawScoreB += 1 + getBonusPoints(pB.formation.front, true, false);
          rawScoreA -= 1 + getBonusPoints(pB.formation.front, true, false);
      }

      // 2. Middle
      const resMid = compareHands(pA.formation.middle, pB.formation.middle, false);
      if (resMid > 0) {
          winsA++;
          rawScoreA += 1 + getBonusPoints(pA.formation.middle, false, true);
          rawScoreB -= 1 + getBonusPoints(pA.formation.middle, false, true);
      } else if (resMid < 0) {
          winsB++;
          rawScoreB += 1 + getBonusPoints(pB.formation.middle, false, true);
          rawScoreA -= 1 + getBonusPoints(pB.formation.middle, false, true);
      }

      // 3. Back
      const resBack = compareHands(pA.formation.back, pB.formation.back, false);
      if (resBack > 0) {
          winsA++;
          rawScoreA += 1 + getBonusPoints(pA.formation.back, false, false);
          rawScoreB -= 1 + getBonusPoints(pA.formation.back, false, false);
      } else if (resBack < 0) {
          winsB++;
          rawScoreB += 1 + getBonusPoints(pB.formation.back, false, false);
          rawScoreA -= 1 + getBonusPoints(pB.formation.back, false, false);
      }

      // 打枪 (Shooting / Scooping): If one player wins all 3 hands against another
      if (winsA === 3) {
          rawScoreA = rawScoreA * 2; // Double the points transfer
          rawScoreB = -rawScoreA;
      } else if (winsB === 3) {
          rawScoreB = rawScoreB * 2;
          rawScoreA = -rawScoreB;
      }

      scores[pA.id] += rawScoreA;
      scores[pB.id] += rawScoreB;
    }
  }
  return scores;
};
