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
  TELEGRAM_BOT_TOKEN: string;
}

// Added UserRow interface
interface UserRow {
  id: number;
  phone: string;
  nickname: string;
  credits: number;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  
  if (!env.TELEGRAM_BOT_TOKEN) {
    return new Response("Bot Token not configured", { status: 500 });
  }

  try {
    const update = await request.json() as any;
    if (!update.message || !update.message.text) {
      return new Response("OK");
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const args = text.split(' ');
    const command = args[0];

    const sendMessage = async (msg: string) => {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg })
      });
    };

    // --- COMMANDS ---

    // /find [phone]
    if (command === '/find' && args[1]) {
      const user = await env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(args[1]).first<UserRow>();
      if (user) {
        await sendMessage(`User Found:\nID: ${user.id}\nNick: ${user.nickname}\nPhone: ${user.phone}\nCredits: ${user.credits}`);
      } else {
        await sendMessage("User not found.");
      }
    }
    
    // /list
    else if (command === '/list') {
      const { results } = await env.DB.prepare("SELECT id, nickname, phone, credits FROM users ORDER BY id DESC LIMIT 10").all();
      if (results && results.length > 0) {
        let msg = "Last 10 Users:\n";
        results.forEach((u: any) => {
          msg += `#${u.id} ${u.nickname} (${u.phone}) - $${u.credits}\n`;
        });
        await sendMessage(msg);
      } else {
        await sendMessage("No users found.");
      }
    }

    // /del [phone]
    else if (command === '/del' && args[1]) {
      const res = await env.DB.prepare("DELETE FROM users WHERE phone = ?").bind(args[1]).run();
      if (res.success) {
        await sendMessage(`User ${args[1]} deleted.`);
      } else {
        await sendMessage("Failed to delete user.");
      }
    }

    // /add [phone] [amount]
    else if (command === '/add' && args[1] && args[2]) {
      const amount = parseInt(args[2]);
      if (isNaN(amount)) {
        await sendMessage("Invalid amount.");
      } else {
        const res = await env.DB.prepare("UPDATE users SET credits = credits + ? WHERE phone = ?").bind(amount, args[1]).run();
        if (res.success) {
          await sendMessage(`Added ${amount} credits to ${args[1]}.`);
        } else {
          await sendMessage("Failed (User likely not found).");
        }
      }
    }

    // /sub [phone] [amount]
    else if (command === '/sub' && args[1] && args[2]) {
        const amount = parseInt(args[2]);
        if (isNaN(amount)) {
          await sendMessage("Invalid amount.");
        } else {
          const res = await env.DB.prepare("UPDATE users SET credits = credits - ? WHERE phone = ?").bind(amount, args[1]).run();
          if (res.success) {
            await sendMessage(`Deducted ${amount} credits from ${args[1]}.`);
          } else {
            await sendMessage("Failed (User likely not found).");
          }
        }
      }

    // Help
    else if (command === '/help' || command === '/start') {
      await sendMessage(
        "Admin Commands:\n" +
        "/find <phone> - Find user\n" +
        "/list - List recent users\n" +
        "/del <phone> - Delete user\n" +
        "/add <phone> <amount> - Add credits\n" +
        "/sub <phone> <amount> - Deduct credits"
      );
    }

    return new Response("OK");

  } catch (e) {
    return new Response("Error", { status: 500 });
  }
};