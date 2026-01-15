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

// Added UserRow interface
interface UserRow {
  id: number;
  phone: string;
  nickname: string;
  credits: number;
  password?: string;
  created_at?: number;
}

// Helper: Simple SHA-256 hash
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  
  try {
    const body = await request.json() as any;
    const { action } = body;

    // --- REGISTER ---
    if (action === 'register') {
      const { phone, nickname, password } = body;
      if (!phone || !nickname || !password || password.length < 6) {
        return new Response(JSON.stringify({ error: "Invalid input. Password must be at least 6 chars." }), { status: 400 });
      }

      const hashedPassword = await hashPassword(password);
      const createdAt = Date.now();

      try {
        const result = await env.DB.prepare(
          "INSERT INTO users (phone, nickname, password, credits, created_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(phone, nickname, hashedPassword, 1000, createdAt).run();
        
        if (result.success) {
           return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
      } catch (e: any) {
        if (e.message.includes('UNIQUE')) {
          return new Response(JSON.stringify({ error: "Phone number already registered." }), { status: 409 });
        }
        throw e;
      }
    }

    // --- LOGIN ---
    if (action === 'login') {
      const { phone, password } = body;
      const hashedPassword = await hashPassword(password);
      
      const user = await env.DB.prepare(
        "SELECT id, phone, nickname, credits FROM users WHERE phone = ? AND password = ?"
      ).bind(phone, hashedPassword).first<UserRow>();

      if (user) {
        return new Response(JSON.stringify({ success: true, user }), { status: 200 });
      } else {
        return new Response(JSON.stringify({ error: "Invalid phone or password." }), { status: 401 });
      }
    }

    // --- SEARCH USER (For Credits) ---
    if (action === 'search') {
      const { phone } = body;
      const user = await env.DB.prepare(
        "SELECT id, phone, nickname FROM users WHERE phone = ?"
      ).bind(phone).first<UserRow>();
      
      if (user) {
        return new Response(JSON.stringify({ success: true, user }), { status: 200 });
      } else {
        return new Response(JSON.stringify({ error: "User not found." }), { status: 404 });
      }
    }

    // --- TRANSFER CREDITS ---
    if (action === 'transfer') {
      const { fromPhone, toPhone, amount } = body;
      const transferAmount = parseInt(amount);

      if (isNaN(transferAmount) || transferAmount <= 0) {
        return new Response(JSON.stringify({ error: "Invalid amount." }), { status: 400 });
      }

      if (fromPhone === toPhone) {
        return new Response(JSON.stringify({ error: "Cannot transfer to yourself." }), { status: 400 });
      }

      // 1. Get sender
      const sender = await env.DB.prepare("SELECT id, credits FROM users WHERE phone = ?").bind(fromPhone).first<UserRow>();
      if (!sender) return new Response(JSON.stringify({ error: "Sender not found." }), { status: 404 });
      if (sender.credits < transferAmount) {
         return new Response(JSON.stringify({ error: "Insufficient credits." }), { status: 400 });
      }

      // 2. Get receiver
      const receiver = await env.DB.prepare("SELECT id FROM users WHERE phone = ?").bind(toPhone).first<UserRow>();
      if (!receiver) return new Response(JSON.stringify({ error: "Receiver not found." }), { status: 404 });

      // 3. Execute Transaction (Batch)
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET credits = credits - ? WHERE id = ?").bind(transferAmount, sender.id),
        env.DB.prepare("UPDATE users SET credits = credits + ? WHERE id = ?").bind(transferAmount, receiver.id)
      ]);

      // Return new balance
      const newBalance = sender.credits - transferAmount;
      return new Response(JSON.stringify({ success: true, newBalance }), { status: 200 });
    }
    
    // --- REFRESH ---
    if (action === 'refresh') {
        const { phone } = body;
        const user = await env.DB.prepare("SELECT id, phone, nickname, credits FROM users WHERE phone = ?").bind(phone).first<UserRow>();
        if (user) {
            return new Response(JSON.stringify({ success: true, user }), { status: 200 });
        }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};