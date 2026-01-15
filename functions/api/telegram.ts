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

interface UserRow {
  id: number;
  phone: string;
  nickname: string;
  credits: number;
}

// Admin Keyboard Layout
const ADMIN_KEYBOARD = {
  keyboard: [
    [{ text: "📊 最新用户" }, { text: "❓ 帮助指令" }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

// 1. Handle GET request to SETUP the Webhook automatically
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Security check: simple shared secret or just check if token exists
  if (!env.TELEGRAM_BOT_TOKEN) {
    return new Response("Error: TELEGRAM_BOT_TOKEN is not set in Cloudflare Settings.", { status: 500 });
  }

  // Check for ?setup=true parameter to trigger webhook registration
  if (url.searchParams.get("setup") === "true") {
    const webhookUrl = `${url.origin}/api/telegram`; // Auto-detect current domain
    
    const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
    
    try {
      const response = await fetch(tgUrl);
      const result = await response.json() as any;
      return new Response(JSON.stringify(result, null, 2), { 
        headers: { "Content-Type": "application/json" } 
      });
    } catch (e: any) {
      return new Response(`Failed to set webhook: ${e.message}`, { status: 500 });
    }
  }

  return new Response("Telegram Bot API is active. Visit this URL with ?setup=true to register the webhook.");
};

// 2. Handle POST request (The actual Bot Logic)
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  
  if (!env.TELEGRAM_BOT_TOKEN) {
    return new Response("Bot Token not configured", { status: 500 });
  }

  try {
    const update = await request.json() as any;
    
    // Ignore updates without text messages
    if (!update.message || !update.message.text) {
      return new Response("OK");
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const args = text.split(' ');
    const command = args[0]; // /start, /find, or "📊 最新用户"

    // Helper to send messages with optional keyboard
    const sendMessage = async (msg: string, showKeyboard = false) => {
      const payload: any = { chat_id: chatId, text: msg };
      if (showKeyboard) {
        payload.reply_markup = ADMIN_KEYBOARD;
      }

      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    };

    // --- LOGIC MAPPING ---

    // 1. HELP / START / ❓ 帮助指令
    if (command === '/start' || command === '/help' || text === '❓ 帮助指令') {
      await sendMessage(
        "👋 <b>十三水管理员控制台</b>\n\n" +
        "可用指令：\n" +
        "/find [手机号] - 查询用户\n" +
        "/del [手机号] - 删除用户\n" +
        "/add [手机号] [数量] - 增加积分\n" +
        "/sub [手机号] [数量] - 扣除积分\n" +
        "或点击下方菜单按钮 👇",
        true // Show keyboard
      );
    }

    // 2. LIST / 📊 最新用户
    else if (command === '/list' || text === '📊 最新用户') {
      try {
        const { results } = await env.DB.prepare("SELECT id, nickname, phone, credits FROM users ORDER BY id DESC LIMIT 10").all();
        if (results && results.length > 0) {
          let msg = "📋 <b>最新 10 位用户:</b>\n\n";
          results.forEach((u: any) => {
            msg += `🆔 <code>${u.id}</code> | ${u.nickname}\n📱 <code>${u.phone}</code> | 💰 ${u.credits}\n\n`;
          });
          await sendMessage(msg, true);
        } else {
          await sendMessage("📭 暂无用户数据。", true);
        }
      } catch (e) {
        await sendMessage("❌ 数据库查询失败。", true);
      }
    }

    // 3. FIND
    else if (command === '/find' && args[1]) {
      const user = await env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(args[1]).first<UserRow>();
      if (user) {
        await sendMessage(`👤 <b>用户详情:</b>\n\nID: ${user.id}\n昵称: ${user.nickname}\n手机: ${user.phone}\n积分: ${user.credits}`);
      } else {
        await sendMessage("❌ 未找到该用户。");
      }
    }

    // 4. DELETE
    else if (command === '/del' && args[1]) {
      const res = await env.DB.prepare("DELETE FROM users WHERE phone = ?").bind(args[1]).run();
      if (res.success) {
        await sendMessage(`🗑 用户 ${args[1]} 已删除。`);
      } else {
        await sendMessage("❌ 删除失败。");
      }
    }

    // 5. ADD CREDITS
    else if (command === '/add' && args[1] && args[2]) {
      const amount = parseInt(args[2]);
      if (isNaN(amount)) {
        await sendMessage("❌ 积分数量无效。");
      } else {
        const res = await env.DB.prepare("UPDATE users SET credits = credits + ? WHERE phone = ?").bind(amount, args[1]).run();
        if (res.success) {
          await sendMessage(`✅ 已为 ${args[1]} 增加 ${amount} 积分。`);
        } else {
          await sendMessage("❌ 操作失败（用户可能不存在）。");
        }
      }
    }

    // 6. SUB CREDITS
    else if (command === '/sub' && args[1] && args[2]) {
        const amount = parseInt(args[2]);
        if (isNaN(amount)) {
          await sendMessage("❌ 积分数量无效。");
        } else {
          const res = await env.DB.prepare("UPDATE users SET credits = credits - ? WHERE phone = ?").bind(amount, args[1]).run();
          if (res.success) {
            await sendMessage(`✅ 已从 ${args[1]} 扣除 ${amount} 积分。`);
          } else {
            await sendMessage("❌ 操作失败（用户可能不存在）。");
          }
        }
    }

    // UNKNOWN
    else {
      // Don't verify known commands to avoid spamming user
      if (command.startsWith('/')) {
        await sendMessage("❌ 未知指令，请输入 /help 查看帮助。", true);
      }
    }

    return new Response("OK");

  } catch (e) {
    return new Response("Error processing update", { status: 500 });
  }
};