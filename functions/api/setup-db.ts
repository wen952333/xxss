
// Add missing D1 type definitions
interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: any;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec<T = unknown>(query: string): Promise<D1ExecResult>;
}

interface Env {
  DB: D1Database;
}

export const onRequest = async (context: { env: Env }) => {
  try {
    // 1. Users Table
    await context.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        nickname TEXT NOT NULL,
        password TEXT NOT NULL,
        credits INTEGER DEFAULT 1000,
        created_at INTEGER
      );
    `).run();

    // 2. Game Decks (Inventory of 300 games)
    // Stores the 4 hands pre-dealt for a specific game ID
    await context.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS game_decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        room_id INTEGER DEFAULT 1,
        batch_id INTEGER, -- To group 1-10, 11-20
        north_hand TEXT,
        south_hand TEXT,
        east_hand TEXT,
        west_hand TEXT,
        created_at INTEGER
      );
    `).run();

    // 3. Player Progress (Async Stage Logic)
    // Tracks which games the player has finished in the current batch
    // sequence_json stores the shuffled order: "[5, 2, 9, 1...]"
    await context.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS player_progress (
        user_id INTEGER PRIMARY KEY,
        current_batch_start INTEGER, -- e.g. 1 (meaning batch 1-10)
        game_sequence_json TEXT, -- The randomized order of IDs for this user
        current_index INTEGER, -- Pointer in the sequence (0-9)
        updated_at INTEGER
      );
    `).run();

    return new Response("Database initialized successfully: 'game_decks' and 'player_progress' created.", { status: 200 });
  } catch (err: any) {
    return new Response(`Error initializing database: ${err.message}`, { status: 500 });
  }
};
