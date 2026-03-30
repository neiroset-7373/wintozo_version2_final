const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const JWT_SECRET = process.env.JWT_SECRET || 'wintozo_ultra_secret_2025_nikita';
const PORT = process.env.PORT || 3001;

// Uploads directory
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// Database
const db = new Database('./wintozo.db');

// Init tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    ban_until TEXT,
    ban_reason TEXT,
    emoji TEXT DEFAULT '😊',
    has_pro INTEGER DEFAULT 0,
    pro_until TEXT,
    activity_days INTEGER DEFAULT 0,
    last_active TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    custom_id TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_username TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    content TEXT,
    file_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    is_read INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user1_id INTEGER,
    user2_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS emoji_battle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emoji TEXT NOT NULL,
    week TEXT NOT NULL,
    registrations INTEGER DEFAULT 0,
    activity INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS channel_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_username TEXT NOT NULL,
    content TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Create admin if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('Admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('2015Nikita2015', 10);
  db.prepare(`
    INSERT INTO users (id, username, password, is_admin, has_pro, pro_until, emoji)
    VALUES (1, 'Admin', ?, 1, 1, '2099-01-01', '👑')
  `).run(hash);
}

// Create Wintozo Official channel
const channelExists = db.prepare('SELECT id FROM channels WHERE name = ?').get('Wintozo Official');
if (!channelExists) {
  db.prepare('INSERT INTO channels (name, description) VALUES (?, ?)').run('Wintozo Official', 'Официальный канал Wintozo');
}

// Create Wintozo Bot user
const botExists = db.prepare('SELECT id FROM users WHERE username = ?').get('WintozоBot');
if (!botExists) {
  const hash = bcrypt.hashSync('bot_secret_pass_123', 10);
  db.prepare(`
    INSERT INTO users (username, password, is_admin, emoji)
    VALUES ('WintozоBot', ?, 1, '🤖')
  `).run(hash);
}

// Multer setup
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use('/uploads', express.static('./uploads'));

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
}

// ===== ROUTES =====

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Wintozo Server работает! 🚀', version: '2.0.0' });
});

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполни все поля' });
  if (username.length < 3) return res.status(400).json({ error: 'Никнейм минимум 3 символа' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: 'Такой никнейм уже занят' });

  const hash = bcrypt.hashSync(password, 10);
  
  // Get next ID starting from 10
  const maxId = db.prepare('SELECT MAX(id) as max FROM users').get();
  const newId = Math.max((maxId.max || 9) + 1, 10);

  try {
    db.prepare(`
      INSERT INTO users (id, username, password, last_active)
      VALUES (?, ?, ?, datetime('now'))
    `).run(newId, username, hash);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    res.cookie('token', token, { 
      httpOnly: true, 
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'none',
      secure: true
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin,
        emoji: user.emoji,
        has_pro: user.has_pro,
        pro_until: user.pro_until,
        needs_emoji: true
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка сервера: ' + e.message });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполни все поля' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(400).json({ error: 'Пользователь не найден' });

  if (user.is_banned) {
    if (user.ban_until === 'infinity' || new Date(user.ban_until) > new Date()) {
      return res.status(403).json({ error: `Ты забанен. Причина: ${user.ban_reason || 'Нарушение правил'}` });
    } else {
      db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(user.id);
    }
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: 'Неверный пароль' });
  }

  // Update activity
  const today = new Date().toDateString();
  const lastActive = user.last_active ? new Date(user.last_active).toDateString() : null;
  let activityDays = user.activity_days || 0;
  if (lastActive !== today) {
    activityDays++;
    db.prepare('UPDATE users SET activity_days = ?, last_active = datetime("now") WHERE id = ?')
      .run(activityDays, user.id);
    
    // Auto give Pro after 7 days
    if (activityDays >= 7 && !user.has_pro) {
      const proUntil = new Date();
      proUntil.setDate(proUntil.getDate() + 14);
      db.prepare('UPDATE users SET has_pro = 1, pro_until = ? WHERE id = ?')
        .run(proUntil.toISOString(), user.id);
    }
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

  res.cookie('token', token, { 
    httpOnly: true, 
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'none',
    secure: true
  });

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

  res.json({
    success: true,
    token,
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      is_admin: updatedUser.is_admin,
      emoji: updatedUser.emoji,
      has_pro: updatedUser.has_pro,
      pro_until: updatedUser.pro_until,
      activity_days: updatedUser.activity_days,
      needs_emoji: !updatedUser.emoji || updatedUser.emoji === '😊'
    }
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Get current user
app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  
  res.json({
    id: user.id,
    username: user.username,
    is_admin: user.is_admin,
    emoji: user.emoji,
    has_pro: user.has_pro,
    pro_until: user.pro_until,
    activity_days: user.activity_days,
    needs_emoji: !user.emoji || user.emoji === '😊'
  });
});

// Set emoji
app.post('/api/set-emoji', authMiddleware, (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Укажи эмодзи' });

  db.prepare('UPDATE users SET emoji = ? WHERE id = ?').run(emoji, req.user.id);

  // Update emoji battle stats
  const week = getWeekKey();
  const existing = db.prepare('SELECT id FROM emoji_battle WHERE emoji = ? AND week = ?').get(emoji, week);
  if (existing) {
    db.prepare('UPDATE emoji_battle SET registrations = registrations + 1 WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO emoji_battle (emoji, week, registrations, activity) VALUES (?, ?, 1, 0)').run(emoji, week);
  }

  res.json({ success: true });
});

// Get users list
app.get('/api/users', authMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, emoji, has_pro, pro_until, is_admin, last_active
    FROM users 
    WHERE id != ? AND is_banned = 0
    ORDER BY username
  `).all(req.user.id);
  res.json(users);
});

// Get messages for chat
app.get('/api/messages/:chatId', authMiddleware, (req, res) => {
  const { chatId } = req.params;
  const messages = db.prepare(`
    SELECT * FROM messages 
    WHERE chat_id = ? 
    ORDER BY created_at ASC
    LIMIT 100
  `).all(chatId);
  res.json(messages);
});

// Send message
app.post('/api/messages', authMiddleware, (req, res) => {
  const { chat_id, content, type, file_url } = req.body;
  if (!chat_id) return res.status(400).json({ error: 'Укажи chat_id' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const result = db.prepare(`
    INSERT INTO messages (chat_id, sender_id, sender_username, type, content, file_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(chat_id, req.user.id, user.username, type || 'text', content, file_url);

  // Update emoji battle activity
  if (user.emoji) {
    const week = getWeekKey();
    const existing = db.prepare('SELECT id FROM emoji_battle WHERE emoji = ? AND week = ?').get(user.emoji, week);
    if (existing) {
      db.prepare('UPDATE emoji_battle SET activity = activity + 1 WHERE id = ?').run(existing.id);
    }
  }

  // Update activity days
  const today = new Date().toDateString();
  const lastActive = user.last_active ? new Date(user.last_active).toDateString() : null;
  if (lastActive !== today) {
    let activityDays = (user.activity_days || 0) + 1;
    db.prepare('UPDATE users SET activity_days = ?, last_active = datetime("now") WHERE id = ?')
      .run(activityDays, user.id);
    if (activityDays >= 7 && !user.has_pro) {
      const proUntil = new Date();
      proUntil.setDate(proUntil.getDate() + 14);
      db.prepare('UPDATE users SET has_pro = 1, pro_until = ? WHERE id = ?')
        .run(proUntil.toISOString(), user.id);
    }
  }

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
  
  // Broadcast via WebSocket
  broadcastToChat(chat_id, { type: 'new_message', message });

  res.json(message);
});

// Upload file
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// Emoji battle stats
app.get('/api/emoji-battle', authMiddleware, (req, res) => {
  const week = getWeekKey();
  const stats = db.prepare(`
    SELECT emoji, SUM(registrations) as registrations, SUM(activity) as activity
    FROM emoji_battle 
    WHERE week = ?
    GROUP BY emoji
    ORDER BY (registrations + activity) DESC
  `).all(week);
  res.json({ week, stats });
});

// ===== ADMIN ROUTES =====

// Admin: get all users
app.get('/api/admin/users', authMiddleware, (req, res) => {
  const admin = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!admin?.is_admin) return res.status(403).json({ error: 'Нет прав' });

  const users = db.prepare('SELECT * FROM users ORDER BY id').all();
  res.json(users);
});

// Admin: get all chats
app.get('/api/admin/chats', authMiddleware, (req, res) => {
  const admin = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!admin?.is_admin) return res.status(403).json({ error: 'Нет прав' });

  const chats = db.prepare('SELECT DISTINCT chat_id FROM messages').all();
  res.json(chats);
});

// Admin: get chat messages (admin can read ALL chats)
app.get('/api/admin/messages/:chatId', authMiddleware, (req, res) => {
  const admin = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!admin?.is_admin) return res.status(403).json({ error: 'Нет прав' });

  const messages = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC').all(req.params.chatId);
  res.json(messages);
});

// Admin command handler
app.post('/api/admin/cmd', authMiddleware, (req, res) => {
  const admin = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!admin?.is_admin) return res.status(403).json({ error: 'Нет прав' });

  const { command } = req.body;
  const result = handleAdminCommand(command);
  res.json(result);
});

// Channel messages
app.get('/api/channel/:name', authMiddleware, (req, res) => {
  const channel = db.prepare('SELECT * FROM channels WHERE name = ?').get(req.params.name);
  if (!channel) return res.status(404).json({ error: 'Канал не найден' });

  const messages = db.prepare(`
    SELECT * FROM channel_messages 
    WHERE channel_id = ? 
    ORDER BY created_at ASC
    LIMIT 100
  `).all(channel.id);
  res.json(messages);
});

// Send to channel (admin or pro)
app.post('/api/channel/:name', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user.is_admin && !user.has_pro) {
    return res.status(403).json({ error: 'Нужна подписка Wintozo Pro' });
  }

  const channel = db.prepare('SELECT * FROM channels WHERE name = ?').get(req.params.name);
  if (!channel) return res.status(404).json({ error: 'Канал не найден' });

  const { content } = req.body;
  const result = db.prepare(`
    INSERT INTO channel_messages (channel_id, sender_id, sender_username, content)
    VALUES (?, ?, ?, ?)
  `).run(channel.id, user.id, user.username, content);

  const message = db.prepare('SELECT * FROM channel_messages WHERE id = ?').get(result.lastInsertRowid);
  
  // Broadcast to all
  broadcastToAll({ type: 'channel_message', channel: req.params.name, message });

  res.json(message);
});

// Update Pro status check
app.post('/api/check-pro', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (user.has_pro && user.pro_until !== '2099-01-01') {
    if (new Date(user.pro_until) < new Date()) {
      db.prepare('UPDATE users SET has_pro = 0 WHERE id = ?').run(user.id);
      return res.json({ has_pro: false });
    }
  }
  res.json({ has_pro: user.has_pro, pro_until: user.pro_until });
});

// ===== ADMIN COMMAND HANDLER =====
function handleAdminCommand(command) {
  const cmd = command.trim();
  
  // /help
  if (cmd === '/help') {
    return {
      success: true,
      output: `📋 КОМАНДЫ WINTOZO ADMIN:

/give w-pro to "username" for N days — выдать Pro
/ban "username" infinity — бан навсегда
/ban "username" N day — бан на N дней
/unban "username" — разбанить
/users — список всех пользователей
/stats — статистика сервера
/announce "текст" — объявление в канал
/kick "username" — кик из системы
/set-emoji "username" "emoji" — сменить эмодзи
/give-id "username" "ID" — сменить ID
/delete-msg ID — удалить сообщение
/pro-list — список Pro пользователей
/ban-list — список забаненных`
    };
  }

  // /give w-pro to "username" for N days
  const giveProMatch = cmd.match(/\/give w-pro to [""]?(\w+)[""]? for (\d+) days?/i);
  if (giveProMatch) {
    const username = giveProMatch[1];
    const days = parseInt(giveProMatch[2]);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return { success: false, output: `❌ Пользователь @${username} не найден` };
    
    const proUntil = new Date();
    proUntil.setDate(proUntil.getDate() + days);
    db.prepare('UPDATE users SET has_pro = 1, pro_until = ? WHERE id = ?')
      .run(proUntil.toISOString(), user.id);
    
    return { success: true, output: `✅ @${username} получил Wintozo Pro на ${days} дней!\nДо: ${proUntil.toLocaleDateString('ru')}` };
  }

  // /ban "username" infinity
  const banInfinityMatch = cmd.match(/\/ban [""]?(\w+)[""]? infinity/i);
  if (banInfinityMatch) {
    const username = banInfinityMatch[1];
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return { success: false, output: `❌ Пользователь @${username} не найден` };
    if (user.is_admin) return { success: false, output: `❌ Нельзя банить администратора` };
    
    db.prepare('UPDATE users SET is_banned = 1, ban_until = "infinity", ban_reason = "Нарушение правил" WHERE id = ?').run(user.id);
    
    // Kick via WebSocket
    kickUser(user.id);
    
    return { success: true, output: `🔨 @${username} забанен навсегда!` };
  }

  // /ban "username" N day
  const banDaysMatch = cmd.match(/\/ban [""]?(\w+)[""]? (\d+) days?/i);
  if (banDaysMatch) {
    const username = banDaysMatch[1];
    const days = parseInt(banDaysMatch[2]);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return { success: false, output: `❌ Пользователь @${username} не найден` };
    if (user.is_admin) return { success: false, output: `❌ Нельзя банить администратора` };
    
    const banUntil = new Date();
    banUntil.setDate(banUntil.getDate() + days);
    db.prepare('UPDATE users SET is_banned = 1, ban_until = ?, ban_reason = "Нарушение правил" WHERE id = ?')
      .run(banUntil.toISOString(), user.id);
    
    kickUser(user.id);
    
    return { success: true, output: `🔨 @${username} забанен на ${days} дней!\nДо: ${banUntil.toLocaleDateString('ru')}` };
  }

  // /unban "username"
  const unbanMatch = cmd.match(/\/unban [""]?(\w+)[""]?/i);
  if (unbanMatch) {
    const username = unbanMatch[1];
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return { success: false, output: `❌ Пользователь @${username} не найден` };
    
    db.prepare('UPDATE users SET is_banned = 0, ban_until = NULL, ban_reason = NULL WHERE id = ?').run(user.id);
    return { success: true, output: `✅ @${username} разбанен!` };
  }

  // /users
  if (cmd === '/users') {
    const users = db.prepare('SELECT id, username, emoji, has_pro, is_banned FROM users ORDER BY id').all();
    const list = users.map(u => 
      `${u.emoji || '😊'} @${u.username} (ID:${u.id})${u.has_pro ? ' 💎' : ''}${u.is_banned ? ' 🚫' : ''}`
    ).join('\n');
    return { success: true, output: `👥 ПОЛЬЗОВАТЕЛИ (${users.length}):\n\n${list}` };
  }

  // /stats
  if (cmd === '/stats') {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const totalMessages = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
    const proUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE has_pro = 1').get().c;
    const bannedUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_banned = 1').get().c;
    
    return { 
      success: true, 
      output: `📊 СТАТИСТИКА WINTOZO:

👥 Пользователей: ${totalUsers}
💎 Pro подписок: ${proUsers}
💬 Сообщений: ${totalMessages}
🚫 Забаненных: ${bannedUsers}
🕐 Сервер: ONLINE` 
    };
  }

  // /announce "text"
  const announceMatch = cmd.match(/\/announce [""](.+)[""]$/i);
  if (announceMatch) {
    const text = announceMatch[1];
    const channel = db.prepare('SELECT * FROM channels WHERE name = ?').get('Wintozo Official');
    if (channel) {
      db.prepare(`
        INSERT INTO channel_messages (channel_id, sender_id, sender_username, content)
        VALUES (?, 1, 'Admin', ?)
      `).run(channel.id, `📢 ОБЪЯВЛЕНИЕ: ${text}`);
    }
    broadcastToAll({ type: 'announcement', text });
    return { success: true, output: `📢 Объявление отправлено в Wintozo Official!` };
  }

  // /kick "username"
  const kickMatch = cmd.match(/\/kick [""]?(\w+)[""]?/i);
  if (kickMatch) {
    const username = kickMatch[1];
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return { success: false, output: `❌ Пользователь @${username} не найден` };
    kickUser(user.id);
    return { success: true, output: `👢 @${username} кикнут из системы!` };
  }

  // /set-emoji "username" "emoji"
  const setEmojiMatch = cmd.match(/\/set-emoji [""]?(\w+)[""]? [""]?(.+?)[""]?$/i);
  if (setEmojiMatch) {
    const username = setEmojiMatch[1];
    const emoji = setEmojiMatch[2].trim();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return { success: false, output: `❌ Пользователь @${username} не найден` };
    db.prepare('UPDATE users SET emoji = ? WHERE id = ?').run(emoji, user.id);
    return { success: true, output: `✅ Эмодзи @${username} изменён на ${emoji}!` };
  }

  // /pro-list
  if (cmd === '/pro-list') {
    const proUsers = db.prepare('SELECT username, emoji, pro_until FROM users WHERE has_pro = 1').all();
    const list = proUsers.map(u => `${u.emoji} @${u.username} — до ${u.pro_until === '2099-01-01' ? '∞' : new Date(u.pro_until).toLocaleDateString('ru')}`).join('\n');
    return { success: true, output: `💎 PRO ПОЛЬЗОВАТЕЛИ:\n\n${list || 'Пусто'}` };
  }

  // /ban-list
  if (cmd === '/ban-list') {
    const bannedUsers = db.prepare('SELECT username, emoji, ban_until, ban_reason FROM users WHERE is_banned = 1').all();
    const list = bannedUsers.map(u => `🚫 @${u.username} — ${u.ban_until === 'infinity' ? '∞' : u.ban_until}`).join('\n');
    return { success: true, output: `🚫 ЗАБАНЕННЫЕ:\n\n${list || 'Никого нет'}` };
  }

  // /delete-msg ID
  const deleteMsgMatch = cmd.match(/\/delete-msg (\d+)/i);
  if (deleteMsgMatch) {
    const msgId = parseInt(deleteMsgMatch[1]);
    db.prepare('DELETE FROM messages WHERE id = ?').run(msgId);
    return { success: true, output: `🗑️ Сообщение #${msgId} удалено!` };
  }

  // /give-id
  const giveIdMatch = cmd.match(/\/give-id [""]?(\w+)[""]? [""]?(\w+)[""]?/i);
  if (giveIdMatch) {
    const username = giveIdMatch[1];
    const newId = giveIdMatch[2];
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return { success: false, output: `❌ Пользователь @${username} не найден` };
    db.prepare('UPDATE users SET custom_id = ? WHERE id = ?').run(newId, user.id);
    return { success: true, output: `✅ @${username} получил кастомный ID: ${newId}!` };
  }

  return { success: false, output: `❌ Неизвестная команда: ${cmd}\nНапиши /help для списка команд` };
}

// ===== WEBSOCKET =====
const clients = new Map(); // userId -> ws

wss.on('connection', (ws, req) => {
  let userId = null;
  let pingInterval = null;

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'auth') {
        try {
          const decoded = jwt.verify(msg.token, JWT_SECRET);
          userId = decoded.id;
          clients.set(userId, ws);
          ws.send(JSON.stringify({ type: 'auth_success', userId }));
          
          // Ping to keep alive
          pingInterval = setInterval(() => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
        } catch {
          ws.send(JSON.stringify({ type: 'auth_error', error: 'Токен недействителен' }));
          ws.close();
        }
        return;
      }

      if (!userId) {
        ws.send(JSON.stringify({ type: 'error', error: 'Не авторизован' }));
        return;
      }

      // Handle different message types
      if (msg.type === 'send_message') {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const result = db.prepare(`
          INSERT INTO messages (chat_id, sender_id, sender_username, type, content, file_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(msg.chat_id, userId, user.username, msg.msg_type || 'text', msg.content, msg.file_url);

        const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
        broadcastToChat(msg.chat_id, { type: 'new_message', message });
      }

      if (msg.type === 'typing') {
        const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        broadcastToChat(msg.chat_id, { 
          type: 'typing', 
          username: user.username, 
          userId,
          chat_id: msg.chat_id 
        }, userId);
      }

      if (msg.type === 'call_offer') {
        const targetWs = clients.get(msg.target_id);
        if (targetWs && targetWs.readyState === targetWs.OPEN) {
          const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
          targetWs.send(JSON.stringify({
            type: 'call_incoming',
            from_id: userId,
            from_username: user.username,
            from_emoji: user.emoji,
            call_type: msg.call_type,
            offer: msg.offer
          }));
        }
      }

      if (msg.type === 'call_answer') {
        const targetWs = clients.get(msg.target_id);
        if (targetWs && targetWs.readyState === targetWs.OPEN) {
          targetWs.send(JSON.stringify({
            type: 'call_answered',
            answer: msg.answer
          }));
        }
      }

      if (msg.type === 'call_ice') {
        const targetWs = clients.get(msg.target_id);
        if (targetWs && targetWs.readyState === targetWs.OPEN) {
          targetWs.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: msg.candidate
          }));
        }
      }

      if (msg.type === 'call_end') {
        const targetWs = clients.get(msg.target_id);
        if (targetWs && targetWs.readyState === targetWs.OPEN) {
          targetWs.send(JSON.stringify({ type: 'call_ended' }));
        }
      }

      if (msg.type === 'call_reject') {
        const targetWs = clients.get(msg.target_id);
        if (targetWs && targetWs.readyState === targetWs.OPEN) {
          targetWs.send(JSON.stringify({ type: 'call_rejected' }));
        }
      }

      if (msg.type === 'pong') {
        // Keep alive acknowledged
      }

    } catch (e) {
      console.error('WS error:', e.message);
    }
  });

  ws.on('close', () => {
    if (userId) {
      clients.delete(userId);
      broadcastToAll({ type: 'user_offline', userId });
    }
    if (pingInterval) clearInterval(pingInterval);
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

function broadcastToChat(chatId, data, excludeId = null) {
  // Parse userIds from chatId
  const parts = chatId.split('_');
  const userIds = parts.map(Number).filter(Boolean);
  
  userIds.forEach(uid => {
    if (uid === excludeId) return;
    const ws = clients.get(uid);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

function broadcastToAll(data) {
  clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

function kickUser(userId) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: 'kicked' }));
    ws.close();
  }
}

function getWeekKey() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

server.listen(PORT, () => {
  console.log(`🚀 Wintozo Server запущен на порту ${PORT}`);
  console.log(`👑 Admin: @Admin / 2015Nikita2015`);
  console.log(`🌐 WebSocket: ws://localhost:${PORT}`);
});
