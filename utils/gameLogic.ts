import { Card, Rank, Suit, HandFormation } from '../types';

export const generateDeck = (): Card[] => {
  const suits = [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds];
  const ranks = [
    Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven,
    Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace
  ];

  const deck: Card[] = [];
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        suit,
        rank,
        id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 9)}`
      });
    });
  });
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const getRankLabel = (rank: Rank): string => {
  switch (rank) {
    case Rank.Jack: return 'J';
    case Rank.Queen: return 'Q';
    case Rank.King: return 'K';
    case Rank.Ace: return 'A';
    default: return rank.toString();
  }
};

export const getSuitColor = (suit: Suit): string => {
  return (suit === Suit.Hearts || suit === Suit.Diamonds) ? 'text-red-500' : 'text-slate-900';
};

export const cardsToString = (cards: Card[]): string => {
  return cards.map(c => {
    let suitName = '';
    if(c.suit === Suit.Spades) suitName = 'Spades';
    if(c.suit === Suit.Hearts) suitName = 'Hearts';
    if(c.suit === Suit.Diamonds) suitName = 'Diamonds';
    if(c.suit === Suit.Clubs) suitName = 'Clubs';
    return `${getRankLabel(c.rank)} of ${suitName}`;
  }).join(', ');
};

// --- Asset Logic (SVG Path) ---

export const getCardAssetPath = (card: Card): string => {
  let rankName = '';
  // Convert Rank enum to filename convention
  // Example: 10_of_clubs.svg, ace_of_spades.svg
  switch (card.rank) {
    case Rank.Ace: rankName = 'ace'; break;
    case Rank.King: rankName = 'king'; break;
    case Rank.Queen: rankName = 'queen'; break;
    case Rank.Jack: rankName = 'jack'; break;
    default: rankName = card.rank.toString(); break; // 2-10
  }

  let suitName = '';
  // Convert Suit enum ('♠', etc) to filename convention ("spades", etc)
  switch (card.suit) {
    case Suit.Spades: suitName = 'spades'; break;
    case Suit.Hearts: suitName = 'hearts'; break;
    case Suit.Clubs: suitName = 'clubs'; break;
    case Suit.Diamonds: suitName = 'diamonds'; break;
  }

  // Assumes images are stored in /cards/ folder in public directory
  return `/cards/${rankName}_of_${suitName}.svg`;
};

// --- Smart Sort Logic ---

// Helper: Sort cards by rank descending
const sortByRank = (cards: Card[]) => [...cards].sort((a, b) => b.rank - a.rank);

// Helper: Check for Flush (return cards if found, else null)
const getFlush = (cards: Card[]): Card[] | null => {
  const suits:Record<string, Card[]> = { [Suit.Spades]: [], [Suit.Hearts]: [], [Suit.Clubs]: [], [Suit.Diamonds]: [] };
  cards.forEach(c => suits[c.suit].push(c));
  
  // Find suit with 5+ cards
  for (const s in suits) {
    if (suits[s].length >= 5) {
      return sortByRank(suits[s]).slice(0, 5);
    }
  }
  return null;
};

// Helper: Check for Pairs/Trips/Quads
const getGroups = (cards: Card[]) => {
  const counts: Record<number, Card[]> = {};
  cards.forEach(c => {
    if (!counts[c.rank]) counts[c.rank] = [];
    counts[c.rank].push(c);
  });
  
  const quads: Card[][] = [];
  const trips: Card[][] = [];
  const pairs: Card[][] = [];
  const singles: Card[][] = [];

  Object.values(counts).forEach(group => {
    if (group.length === 4) quads.push(group);
    else if (group.length === 3) trips.push(group);
    else if (group.length === 2) pairs.push(group);
    else singles.push(group);
  });

  // Sort groups by rank descending
  const sortGroups = (arr: Card[][]) => arr.sort((a, b) => b[0].rank - a[0].rank);
  return {
    quads: sortGroups(quads),
    trips: sortGroups(trips),
    pairs: sortGroups(pairs),
    singles: sortGroups(singles)
  };
};

// Strategy 1: Rank Based (Simulate putting strongest high cards in back/middle)
const strategyRank = (cards: Card[]): HandFormation => {
  const sorted = sortByRank(cards);
  return {
    back: sorted.slice(0, 5),
    middle: sorted.slice(5, 10),
    front: sorted.slice(10, 13)
  };
};

// Strategy 2: Pairs/FullHouse priority
const strategyPairs = (cards: Card[]): HandFormation => {
  const groups = getGroups(cards);
  let remaining = [...cards];
  const back: Card[] = [];
  const middle: Card[] = [];
  const front: Card[] = [];

  const removeCards = (targets: Card[]) => {
    const ids = new Set(targets.map(t => t.id));
    remaining = remaining.filter(c => !ids.has(c.id));
  };

  // Try to fill Back with Full House or Trips
  if (groups.trips.length > 0 && groups.pairs.length > 0) {
    const t = groups.trips[0];
    const p = groups.pairs[0];
    back.push(...t, ...p);
    removeCards(back);
  } else if (groups.pairs.length >= 2) {
    const p1 = groups.pairs[0];
    const p2 = groups.pairs[1];
    back.push(...p1, ...p2);
    const kicker = remaining.find(c => c.id !== p1[0].id && c.id !== p1[1].id && c.id !== p2[0].id && c.id !== p2[1].id);
    if (kicker) back.push(kicker);
    removeCards(back);
  } else {
    const high = sortByRank(remaining).slice(0, 5);
    back.push(...high);
    removeCards(back);
  }

  // Try to fill Middle
  const midGroups = getGroups(remaining);
  if (midGroups.pairs.length >= 2) {
     const p1 = midGroups.pairs[0];
     const p2 = midGroups.pairs[1];
     middle.push(...p1, ...p2);
     const kicker = remaining.find(c => !middle.includes(c));
     if (kicker) middle.push(kicker);
     removeCards(middle);
  } else if (midGroups.pairs.length === 1) {
     middle.push(...midGroups.pairs[0]);
     const kickers = remaining.filter(c => !middle.includes(c)).slice(0, 3);
     middle.push(...kickers);
     removeCards(middle);
  } else {
     middle.push(...sortByRank(remaining).slice(0, 5));
     removeCards(middle);
  }

  front.push(...remaining);

  return { front, middle, back };
};

// Strategy 3: Flush priority
const strategyFlush = (cards: Card[]): HandFormation => {
  let remaining = [...cards];
  const back: Card[] = [];
  const middle: Card[] = [];
  
  const flush = getFlush(remaining);
  if (flush) {
    back.push(...flush);
    const ids = new Set(flush.map(c => c.id));
    remaining = remaining.filter(c => !ids.has(c.id));
  } else {
    const high = sortByRank(remaining).slice(0, 5);
    back.push(...high);
    remaining = remaining.filter(c => !high.includes(c));
  }

  const flush2 = getFlush(remaining);
  if (flush2) {
    middle.push(...flush2);
    const ids = new Set(flush2.map(c => c.id));
    remaining = remaining.filter(c => !ids.has(c.id));
  } else {
    const groups = getGroups(remaining);
    if (groups.pairs.length > 0) {
      middle.push(...groups.pairs[0]);
      const kickers = remaining.filter(c => c.id !== groups.pairs[0][0].id && c.id !== groups.pairs[0][1].id).slice(0, 3);
      middle.push(...kickers);
    } else {
      middle.push(...sortByRank(remaining).slice(0, 5));
    }
    const midIds = new Set(middle.map(c => c.id));
    remaining = remaining.filter(c => !midIds.has(c.id));
  }

  return {
    back,
    middle,
    front: remaining
  };
};

export const getSmartRecommendations = (cards: Card[]): HandFormation[] => {
  const s1 = strategyRank(cards);
  const s2 = strategyPairs(cards);
  const s3 = strategyFlush(cards);

  const formations = [s2, s3, s1];
  const unique: HandFormation[] = [];
  const seen = new Set<string>();

  formations.forEach(f => {
    const sig = f.back.map(c=>c.id).sort().join('') + f.middle.map(c=>c.id).sort().join('');
    if (!seen.has(sig)) {
      seen.add(sig);
      unique.push(f);
    }
  });

  return unique;
};