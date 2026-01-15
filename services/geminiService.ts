import { Card, HandFormation } from "../types";

export const getAiHandSuggestion = async (cards: Card[]): Promise<HandFormation | null> => {
  try {
    const response = await fetch('/api/suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cards }),
    });

    if (!response.ok) {
      console.error(`Server error: ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (result.frontIndices && result.middleIndices && result.backIndices) {
      // Helper to safely map indices back to cards based on the original order
      // We rely on the server returning indices 0-12 corresponding to the input array
      const mapIndicesToCards = (indices: number[]) => 
        indices.map(i => cards[i]).filter(c => c !== undefined);

      const front = mapIndicesToCards(result.frontIndices);
      const middle = mapIndicesToCards(result.middleIndices);
      const back = mapIndicesToCards(result.backIndices);
      
      // Basic validation to ensure we have the right number of cards
      if (front.length === 3 && middle.length === 5 && back.length === 5) {
        return { front, middle, back };
      }
    }
    return null;

  } catch (error) {
    console.error("AI Suggestion Error:", error);
    return null;
  }
};