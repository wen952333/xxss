
export enum Suit {
  Spades = '♠',
  Hearts = '♥',
  Clubs = '♣',
  Diamonds = '♦'
}

export enum Rank {
  Two = 2, Three, Four, Five, Six, Seven, Eight, Nine, Ten, Jack, Queen, King, Ace
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // unique identifier for React keys
}

export enum GamePhase {
  Idle = 'IDLE',
  Dealing = 'DEALING',
  Sorting = 'SORTING',
  Revealing = 'REVEALING',
  Result = 'RESULT'
}

export interface HandFormation {
  front: Card[]; // 3 cards
  middle: Card[]; // 5 cards
  back: Card[]; // 5 cards
}

export enum Seat {
  North = 'N',
  South = 'S',
  East = 'E',
  West = 'W'
}

export interface Player {
  id: string;
  name: string;
  isAi: boolean;
  hand: Card[]; // The initial 13 cards
  formation?: HandFormation; // The organized hand
  score: number;
  seat?: Seat; // The specific seat they occupied in the original deal
}

export interface User {
  id: number;
  phone: string;
  nickname: string;
  credits: number;
  token?: string;
}

// Response from API for current game hand
export interface GameHandResponse {
  gameId: number; // The visual "Table ID" (1-10, etc)
  hand: Card[];
  remainingInStage: number; // How many games left in this set of 10
}
