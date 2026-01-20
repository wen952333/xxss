
// --- Inline Types to avoid build resolution issues in Cloudflare Pages Functions ---
enum Suit {
  Spades = '♠',
  Hearts = '♥',
  Clubs = '♣',
  Diamonds = '♦'
}

enum Rank {
  Two = 2, Three, Four, Five, Six, Seven, Eight, Nine, Ten, Jack, Queen, King, Ace
}

interface Env {
  DB: any;
}

// --- Utils for Deck Generation ---
const generateDeck = (): any[] => {
  const suits = [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds];
  const ranks = [
    Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven, 
    Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace
  ];
  const deck: any[] = [];
  suits.forEach(suit => {
    ranks.forEach(rank => {
      // Create a unique ID for each card
      deck.push({ 
        suit, 
        rank, 
        id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 5)}` 
      });
    });
  });
  return deck;
};

const shuffleAndDeal = () => {
  const deck = generateDeck();
  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
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
      // Ensure userId is valid, fallback to random if missing (guest)
      const currentUserId = userId || Math.floor(Math.random() * 1000000);

      if (!env.DB) {
          throw new Error("Database binding (DB) not found. Please check Cloudflare settings.");
      }

      // --- 0. JOIN ROOM ---
      if (action === 'join_room') {
        if (!seat) return new Response(JSON.stringify({ error: "Seat required" }), { status: 400 });

        // Cleanup old session for this user in this room to prevent duplicate seats
        await env.DB.prepare("DELETE FROM room_players WHERE room_id = ? AND user_id = ?").bind(currentRoomId, currentUserId).run();
        
        // Check if seat is taken by someone else
        const taken = await env.DB.prepare("SELECT * FROM room_players WHERE room_id = ? AND seat = ?").bind(currentRoomId, seat).first();
        if (taken) {
            return new Response(JSON.stringify({ success: false, error: "该座位已被占用" }), { status: 200 });
        }

        // Occupy seat
        await env.DB.prepare("INSERT INTO room_players (room_id, seat, user_id, updated_at) VALUES (?, ?, ?, ?)")
            .bind(currentRoomId, seat, currentUserId, Date.now()).run();

        // Count players
        const countRes = await env.DB.prepare("SELECT COUNT(*) as count FROM room_players WHERE room_id = ?").bind(currentRoomId).first();
        const count = countRes?.count || 1;

        return new Response(JSON.stringify({ success: true, playerCount: count }), { status: 200 });
      }

      // --- 1. START STAGE ---
      if (action === 'start_stage') {
        // Double check count
        const countRes = await env.DB.prepare("SELECT COUNT(*) as count FROM room_players WHERE room_id = ?").bind(currentRoomId).first();
        const playerCount = countRes?.count || 0;

        // Check if at least 2 players
        if (playerCount < 2) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: "WAITING_FOR_PLAYERS", 
                message: `等待玩家加入... (${playerCount}/4，至少2人)` 
            }), { status: 200 });
        }

        // Check Inventory
        let currentDeckCount = 0;
        try {
            const deckCountRes = await env.DB.prepare("SELECT COUNT(*) as count FROM game_decks WHERE room_id = ?").bind(currentRoomId).first();
            currentDeckCount = deckCountRes?.count || 0;
        } catch (e) {
            // Table might not exist
            return new Response(JSON.stringify({ error: "Database tables missing. Please visit /api/setup-db" }), { status: 500 });
        }
        
        if (currentDeckCount < 20) {
          const batchSize = 5; // Reduced batch size to safely fit in execution limits
          const statements = [];
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

        // User Progress
        let progress = await env.DB.prepare("SELECT * FROM player_progress WHERE user_id = ?").bind(currentUserId).first();
        if (!progress || progress.current_index >= 10) {
            const nextBatchId = progress ? (progress.current_batch_start + 1) : 1;
            
            // Get valid game IDs
            const roomGames = await env.DB.prepare("SELECT id FROM game_decks WHERE room_id = ? ORDER BY RANDOM() LIMIT 10").bind(currentRoomId).all();
            
            let gameIds = [];
            if (roomGames.results && roomGames.results.length > 0) {
                 gameIds = roomGames.results.map((r: any) => r.id);
            } else {
                 // Should imply deck generation failed or race condition
                 return new Response(JSON.stringify({ error: "Generating decks..." }), { status: 500 });
            }

            await env.DB.prepare(`
                INSERT OR REPLACE INTO player_progress (user_id, current_batch_start, game_sequence_json, current_index, updated_at)
                VALUES (?, ?, ?, 0, ?)
            `).bind(currentUserId, nextBatchId, JSON.stringify(gameIds), Date.now()).run();
            
            progress = { current_batch_start: nextBatchId, game_sequence_json: JSON.stringify(gameIds), current_index: 0 };
        }

        return new Response(JSON.stringify({ 
            success: true, 
            batchId: progress.current_batch_start
        }), { status: 200 });
      }

      // --- 2. GET HAND ---
      if (action === 'get_hand') {
        const progress = await env.DB.prepare("SELECT * FROM player_progress WHERE user_id = ?").bind(currentUserId).first();
        
        if (!progress) {
             return new Response(JSON.stringify({ error: "Please click Start Game again" }), { status: 400 });
        }
        
        const sequence = JSON.parse(progress.game_sequence_json as string);
        const targetGameId = sequence[progress.current_index] || sequence[0]; 
        const gameData = await env.DB.prepare("SELECT * FROM game_decks WHERE id = ?").bind(targetGameId).first(); 
        
        let targetHand = [];
        if (gameData) {
            let colData = gameData.north_hand;
            if (seat === 'S') colData = gameData.south_hand;
            if (seat === 'E') colData = gameData.east_hand;
            if (seat === 'W') colData = gameData.west_hand;
            try { targetHand = JSON.parse(colData as string); } catch(e) {}
        } else {
             targetHand = shuffleAndDeal().N; // fallback
        }

        return new Response(JSON.stringify({
            success: true,
            gameId: targetGameId,
            hand: targetHand
        }), { status: 200 });
      }

      // --- 3. SUBMIT ---
      if (action === 'submit_result') {
          if (!gameId) return new Response(JSON.stringify({ error: "Missing gameId" }), { status: 400 });
          const gameData = await env.DB.prepare("SELECT north_hand, south_hand, east_hand, west_hand FROM game_decks WHERE id = ?").bind(gameId).first();
          
          if (!gameData) return new Response(JSON.stringify({ error: "Game not found" }), { status: 404 });
          
          await env.DB.prepare("UPDATE player_progress SET current_index = current_index + 1 WHERE user_id = ?").bind(currentUserId).run();
          
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
      // Return JSON error even for 500s so frontend can debug
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
      });
  }
};
