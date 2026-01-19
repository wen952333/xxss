import { Suit, Rank, Card } from '../../types';

interface Env {
  DB: any;
}

// --- Utils for Deck Generation ---
const generateDeck = (): any[] => {
  const suits = ['♠', '♥', '♣', '♦'];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J, 14=A
  const deck: any[] = [];
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({ suit, rank, id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 5)}` });
    });
  });
  return deck;
};

const shuffleAndDeal = () => {
  const deck = generateDeck();
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  // Split into 4 hands
  return {
    N: deck.slice(0, 13),
    E: deck.slice(13, 26),
    S: deck.slice(26, 39),
    W: deck.slice(39, 52)
  };
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  
  try {
      const body = await request.json() as any;
      const { action, userId, roomId, seat, gameId } = body;
      const currentRoomId = roomId || 1;

      // --- 1. START STAGE (Join Room) ---
      if (action === 'start_stage') {
        // A. Check Inventory & Refill if needed
        // Use count to see how many games exist for this room
        const countRes = await env.DB.prepare("SELECT COUNT(*) as count FROM game_decks WHERE room_id = ?").bind(currentRoomId).first();
        const currentCount = countRes?.count || 0;
        
        // If inventory is low (< 100), generate more. 
        // Optimization: Generate in smaller chunks (e.g. 50) to avoid CPU timeout (Error 500)
        if (currentCount < 100) {
          const batchSize = 50; 
          const statements = [];
          
          // Get the max ID just to assign batch_ids roughly, though batch_id logic can be simpler
          const lastGame = await env.DB.prepare("SELECT MAX(id) as maxId FROM game_decks").first();
          let nextIdStart = (lastGame?.maxId || 0) + 1;

          for (let i = 0; i < batchSize; i++) {
            const hands = shuffleAndDeal();
            const batchId = Math.ceil((nextIdStart + i) / 10);
            statements.push(
              env.DB.prepare("INSERT INTO game_decks (room_id, batch_id, north_hand, south_hand, east_hand, west_hand, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
              .bind(currentRoomId, batchId, JSON.stringify(hands.N), JSON.stringify(hands.S), JSON.stringify(hands.E), JSON.stringify(hands.W), Date.now())
            );
          }
          if (statements.length > 0) await env.DB.batch(statements);
        }

        // B. Get User Progress
        // Note: For this version, progress is global per user. If playing in different rooms, we reset the sequence if needed.
        let progress = await env.DB.prepare("SELECT * FROM player_progress WHERE user_id = ?").bind(userId).first();
        
        // If no progress or finished current batch (index >= 10), start new batch
        if (!progress || progress.current_index >= 10) {
            const nextBatchId = progress ? (progress.current_batch_start + 1) : 1;
            
            // C. Fetch Game IDs for this batch from the specific Room
            // We need 10 random game IDs from this room
            const roomGames = await env.DB.prepare("SELECT id FROM game_decks WHERE room_id = ? ORDER BY RANDOM() LIMIT 10").bind(currentRoomId).all();
            
            let gameIds = [];
            if (roomGames.results && roomGames.results.length > 0) {
                 gameIds = roomGames.results.map((r: any) => r.id);
            } else {
                 // Fallback if DB is empty (shouldn't happen due to step A)
                 gameIds = [1];
            }

            // Save new progress
            await env.DB.prepare(`
                INSERT OR REPLACE INTO player_progress (user_id, current_batch_start, game_sequence_json, current_index, updated_at)
                VALUES (?, ?, ?, 0, ?)
            `).bind(userId, nextBatchId, JSON.stringify(gameIds), Date.now()).run();

            progress = { current_batch_start: nextBatchId, game_sequence_json: JSON.stringify(gameIds), current_index: 0 };
        }

        return new Response(JSON.stringify({ 
            success: true, 
            batchId: progress.current_batch_start,
            gamesPlayed: progress.current_index,
            totalGames: 10
        }), { status: 200 });
      }

      // --- 2. GET NEXT HAND ---
      if (action === 'get_hand') {
        const progress = await env.DB.prepare("SELECT * FROM player_progress WHERE user_id = ?").bind(userId).first();
        
        if (!progress || progress.current_index >= 10) {
            return new Response(JSON.stringify({ error: "Stage finished or not started" }), { status: 400 });
        }

        const sequence = JSON.parse(progress.game_sequence_json as string);
        const targetGameId = sequence[progress.current_index] || sequence[0]; 

        const gameData = await env.DB.prepare("SELECT * FROM game_decks WHERE id = ?").bind(targetGameId).first(); 
        
        let targetHand = [];
        if (!gameData) {
            // Emergency fallback
            targetHand = shuffleAndDeal().N;
        } else {
            let colData = gameData.north_hand;
            if (seat === 'S') colData = gameData.south_hand;
            if (seat === 'E') colData = gameData.east_hand;
            if (seat === 'W') colData = gameData.west_hand;
            try {
                targetHand = JSON.parse(colData as string);
            } catch(e) { targetHand = []; }
        }

        return new Response(JSON.stringify({
            success: true,
            gameId: targetGameId,
            displayId: progress.current_index + 1,
            hand: targetHand,
            remaining: 10 - progress.current_index
        }), { status: 200 });
      }

      // --- 3. SUBMIT RESULT (REVEAL ALL HANDS) ---
      if (action === 'submit_result') {
          if (!gameId) return new Response(JSON.stringify({ error: "Missing gameId" }), { status: 400 });

          // Fetch the full hands for this game ID so the frontend can calculate scores
          const gameData = await env.DB.prepare("SELECT north_hand, south_hand, east_hand, west_hand FROM game_decks WHERE id = ?").bind(gameId).first();

          if (!gameData) return new Response(JSON.stringify({ error: "Game not found" }), { status: 404 });

          // Move pointer forward
          await env.DB.prepare("UPDATE player_progress SET current_index = current_index + 1 WHERE user_id = ?").bind(userId).run();
          
          return new Response(JSON.stringify({ 
              success: true,
              hands: {
                  N: JSON.parse(gameData.north_hand as string),
                  S: JSON.parse(gameData.south_hand as string),
                  E: JSON.parse(gameData.east_hand as string),
                  W: JSON.parse(gameData.west_hand as string)
              }
          }), { status: 200 });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
      
  } catch (err: any) {
      // Catch 500 errors and return JSON
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500 });
  }
};