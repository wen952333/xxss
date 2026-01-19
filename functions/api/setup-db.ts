
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
    // 1. Users Table (Keep existing if possible, but for safety in dev we might need to alter it. 
    // For this demo, we assume users table is fine or we create it if missing)
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

    // 2. Room Players (New Table for Real-time Seating)
    // We drop it to ensure schema is fresh
    await context.env.DB.prepare(`DROP TABLE IF EXISTS room_players`).run();
    await context.env.DB.prepare(`
      CREATE TABLE room_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        seat TEXT NOT NULL, -- 'N', 'S', 'E', 'W'
        user_id INTEGER NOT NULL,
        updated_at INTEGER
      );
    `).run();

    // 3. Game Decks (Inventory)
    // Drop and recreate to ensure room_id column exists
    await context.env.DB.prepare(`DROP TABLE IF EXISTS game_decks`).run();
    await context.env.DB.prepare(`
      CREATE TABLE game_decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        room_id INTEGER DEFAULT 1,
        batch_id INTEGER, 
        north_hand TEXT,
        south_hand TEXT,
        east_hand TEXT,
        west_hand TEXT,
        created_at INTEGER
      );
    `).run();

    // 4. Player Progress
    await context.env.DB.prepare(`DROP TABLE IF EXISTS player_progress`).run();
    await context.env.DB.prepare(`
      CREATE TABLE player_progress (
        user_id INTEGER PRIMARY KEY,
        current_batch_start INTEGER,
        game_sequence_json TEXT,
        current_index INTEGER,
        updated_at INTEGER
      );
    `).run();

    return new Response("Database reset and initialized successfully. All tables recreated.", { status: 200 });
  } catch (err: any) {
    return new Response(`Error initializing database: ${err.message}`, { status: 500 });
  }
};
