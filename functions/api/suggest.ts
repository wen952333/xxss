import { GoogleGenAI } from "@google/genai";

interface Env {
  API_KEY: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const apiKey = context.env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { cards } = await context.request.json() as { cards: any[] };
    if (!cards || cards.length !== 13) {
      return new Response(JSON.stringify({ error: "Invalid cards data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cardsDescription = cards.map((c, i) => `${i}:${c.rank}-${c.suit}`).join(", ");

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Use gemini-3-pro-preview for advanced reasoning (Thirteen Water logic is complex)
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `
        You are a generic Chinese Poker (Thirteen Water/Shi San Shui) expert.
        I have 13 cards. Organize them into three hands: 
        1. Front (3 cards) - Weakest
        2. Middle (5 cards) - Stronger than Front
        3. Back (5 cards) - Strongest
        
        Rules: 
        - Back > Middle > Front
        - Common Hands: Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, One Pair, High Card.
        - Front hand (3 cards) can only be Three of a Kind, One Pair, or High Card.
        
        Cards (Index:Rank-Suit): ${cardsDescription}
        
        Analyze the best combination to maximize points and ensure the hand is valid (no "fouling").
        Return ONLY a JSON object with indices of the cards for each hand.
        Example format: { "frontIndices": [0, 1, 2], "middleIndices": [3, 4, 5, 6, 7], "backIndices": [8, 9, 10, 11, 12] }
      `,
      config: {
        responseMimeType: "application/json",
        // Enable thinking to allow the model to verify 13-water validity logic
        thinkingConfig: { thinkingBudget: 2048 } 
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    return new Response(text, {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};