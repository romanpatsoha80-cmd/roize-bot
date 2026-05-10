/**
 * ╔══════════════════════════════════════════════════╗
 * ║          ROIZE SHOP — TELEGRAM BOT               ║
 * ║  Управление магазином в реальном времени         ║
 * ╚══════════════════════════════════════════════════╝
 *
 * УСТАНОВКА:
 *   1. npm install node-fetch  (или используйте встроенный fetch в Node 18+)
 *   2. Вставьте свои данные ниже
 *   3. node roize-bot.js
 *
 * ДЕПЛОЙ (бесплатно):
 *   - Railway.app: подключите GitHub репо, задайте переменные окружения
 *   - Render.com: аналогично
 *   - VPS: запустите через pm2 start roize-bot.js
 */

// ════════════════════════════════════════════════
// ⚙️  НАСТРОЙКИ — заполните перед запуском
// ════════════════════════════════════════════════
const BOT_TOKEN   = '8532319054:AAE13201ihaSqeAeS6iMES4C0yOonKSmhOY';
const ADMIN_ID    = '8634544640'; // ваш chat_id (узнайте у @userinfobot)
const FIREBASE_URL = 'https://roizeshop-default-rtdb.europe-west1.firebasedatabase.app';

// ════════════════════════════════════════════════
// Значения по умолчанию
// ════════════════════════════════════════════════
const DEFAULT_CONFIG = {
  shopName: 'Roize Shop',
  tagline:  'Стиль жизни — качество',
  wallet:   'UQAhVDy7iEwmf8aq5WPci4RqAM9266RImUMyDGgDi2k3LpAm',
  products: [
    { name: 'Товар 1', price: '$12 / 1г', emoji: '🌿', img: '', active: true },
    { name: 'Товар 2', price: '$22 / 2г', emoji: '🍃', img: '', active: true },
    { name: 'Товар 3', price: '$55 / 5г', emoji: '✨', img: '', active: true }
  ]
};

// ────────────────────────────────────────────────
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
let offset = 0;

// ════════════════════════════════════════════════
// FIREBASE HELPERS
// ════════════════════════════════════════════════
async function fbGet(path = '') {
  const r = await fetch(`${FIREBASE_URL}/${path}.json`);
  return r.ok ? r.json() : null;
}
async function fbSet(path, data) {
  const r = await fetch(`${FIREBASE_URL}/${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return r.ok;
}
async function getConfig() {
  const data = await fbGet('config');
  return { ...DEFAULT_CONFIG, ...(data || {}), products: (data?.products || DEFAULT_CONFIG.products) };
}
async function patchConfig(patch) {
  const current = await getConfig();
  return fbSet('config', { ...current, ...patch });
}

// ════════════════════════════════════════════════
// TELEGRAM HELPERS
// ════════════════════════════════════════════════
async function sendMsg(chatId, text, extra = {}) {
  await fetch(`${TG}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra })
  });
}

function isAdmin(id) {
  return String(id) === String(ADMIN_ID);
}

// ════════════════════════════════════════════════
// КОМАНДЫ БОТА
// ════════════════════════════════════════════════
const HELP_TEXT = `
🌹 *Roize Shop Bot — Команды*

*Общее*
/start — приветствие
/status — статус магазина
/help — список команд

*Название*
/setname <Новое название> — сменить название магазина
/settagline <Слоган> — сменить слоган

*Товары*
/products — список товаров
/addproduct <emoji> <название> <цена> — добавить товар
  _Пример:_ /addproduct 🔥 Premium $100/г
/editproduct <номер> <emoji> <название> <цена> — изменить товар
  _Пример:_ /editproduct 1 🔥 Premium $80/г
/delproduct <номер> — удалить товар
/toggleproduct <номер> — вкл/выкл товар

*Кошелёк*
/setwallet <адрес> — сменить адрес кошелька

*Сброс*
/reset — сбросить всё к дефолту
`;

async function handleStart(chatId) {
  const cfg = await getConfig();
  const msg = `
🌹 *Добро пожаловать в ${cfg.shopName} Bot!*

Этот бот управляет вашим магазином в *реальном времени*.
Изменения применяются на сайте автоматически — без перезагрузки.

📋 Используйте /help чтобы увидеть все команды.

🛒 *Текущее состояние:*
• Название: ${cfg.shopName}
• Слоган: ${cfg.tagline}
• Товаров: ${cfg.products.filter(p => p.active !== false).length} активных
• Кошелёк: \`${cfg.wallet.slice(0,12)}...\`
  `.trim();
  await sendMsg(chatId, msg);
}

async function handleStatus(chatId) {
  const cfg = await getConfig();
  const prods = cfg.products.map((p, i) =>
    `${i+1}. ${p.active !== false ? '✅' : '❌'} ${p.emoji} *${p.name}* — ${p.price}`
  ).join('\n');

  await sendMsg(chatId, `
📊 *Статус ${cfg.shopName}*

*Слоган:* ${cfg.tagline}
*Кошелёк:* \`${cfg.wallet}\`

*Товары:*
${prods}
  `.trim());
}

async function handleProducts(chatId) {
  const cfg = await getConfig();
  if (!cfg.products.length) { await sendMsg(chatId, '📦 Товаров нет. Добавьте: /addproduct'); return; }
  const list = cfg.products.map((p, i) =>
    `${i+1}. ${p.active !== false ? '✅' : '❌'} ${p.emoji} *${p.name}* — ${p.price}`
  ).join('\n');
  await sendMsg(chatId, `📦 *Список товаров:*\n\n${list}\n\n_Редактировать: /editproduct <номер> <emoji> <название> <цена>_`);
}

async function handleSetName(chatId, args) {
  if (!args) { await sendMsg(chatId, '⚠️ Укажите название: /setname Новое Имя'); return; }
  await patchConfig({ shopName: args });
  await sendMsg(chatId, `✅ Название магазина изменено на *${args}*\nОбновится на сайте через 30 сек.`);
}

async function handleSetTagline(chatId, args) {
  if (!args) { await sendMsg(chatId, '⚠️ Укажите слоган: /settagline Мой слоган'); return; }
  await patchConfig({ tagline: args });
  await sendMsg(chatId, `✅ Слоган изменён: _${args}_\nОбновится на сайте через 30 сек.`);
}

async function handleAddProduct(chatId, args) {
  if (!args) {
    await sendMsg(chatId, '⚠️ Формат: /addproduct 🔥 Premium $100/г');
    return;
  }
  const parts = args.split(' ');
  if (parts.length < 3) { await sendMsg(chatId, '⚠️ Формат: /addproduct 🔥 Название Цена'); return; }
  const emoji = parts[0];
  const price = parts[parts.length - 1];
  const name  = parts.slice(1, -1).join(' ');
  const cfg = await getConfig();
  cfg.products.push({ name, price, emoji, img: '', active: true });
  await fbSet('config', cfg);
  await sendMsg(chatId, `✅ Товар добавлен!\n${emoji} *${name}* — ${price}\n\nПозиция: ${cfg.products.length}\nОбновится на сайте через 30 сек.`);
}

async function handleEditProduct(chatId, args) {
  if (!args) { await sendMsg(chatId, '⚠️ Формат: /editproduct 1 🔥 Название Цена'); return; }
  const parts = args.split(' ');
  const idx = parseInt(parts[0]) - 1;
  if (parts.length < 4) { await sendMsg(chatId, '⚠️ Формат: /editproduct <номер> <emoji> <название> <цена>'); return; }
  const cfg = await getConfig();
  if (idx < 0 || idx >= cfg.products.length) { await sendMsg(chatId, `⚠️ Нет товара с номером ${idx+1}`); return; }
  const emoji = parts[1];
  const price = parts[parts.length - 1];
  const name  = parts.slice(2, -1).join(' ');
  cfg.products[idx] = { ...cfg.products[idx], emoji, name, price };
  await fbSet('config', cfg);
  await sendMsg(chatId, `✅ Товар #${idx+1} обновлён!\n${emoji} *${name}* — ${price}\nОбновится на сайте через 30 сек.`);
}

async function handleDelProduct(chatId, args) {
  const idx = parseInt(args) - 1;
  const cfg = await getConfig();
  if (isNaN(idx) || idx < 0 || idx >= cfg.products.length) {
    await sendMsg(chatId, `⚠️ Укажите номер товара (1-${cfg.products.length}): /delproduct 2`);
    return;
  }
  const removed = cfg.products.splice(idx, 1)[0];
  await fbSet('config', cfg);
  await sendMsg(chatId, `🗑 Товар *${removed.name}* удалён.\nОбновится на сайте через 30 сек.`);
}

async function handleToggleProduct(chatId, args) {
  const idx = parseInt(args) - 1;
  const cfg = await getConfig();
  if (isNaN(idx) || idx < 0 || idx >= cfg.products.length) {
    await sendMsg(chatId, `⚠️ Укажите номер: /toggleproduct 2`);
    return;
  }
  cfg.products[idx].active = !(cfg.products[idx].active !== false);
  await fbSet('config', cfg);
  const p = cfg.products[idx];
  await sendMsg(chatId, `${p.active ? '✅ Включён' : '❌ Скрыт'}: ${p.emoji} *${p.name}*\nОбновится на сайте через 30 сек.`);
}

async function handleSetWallet(chatId, args) {
  if (!args || args.length < 10) { await sendMsg(chatId, '⚠️ Укажите адрес: /setwallet UQ...'); return; }
  await patchConfig({ wallet: args });
  await sendMsg(chatId, `✅ Кошелёк обновлён:\n\`${args}\`\nОбновится на сайте через 30 сек.`);
}

async function handleReset(chatId) {
  await fbSet('config', DEFAULT_CONFIG);
  await sendMsg(chatId, '♻️ Конфиг сброшен к дефолтным значениям.\nОбновится на сайте через 30 сек.');
}

// ════════════════════════════════════════════════
// ОСНОВНОЙ ЦИКЛ (Long Polling)
// ════════════════════════════════════════════════
async function processUpdate(update) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  // Всегда отвечаем на /start, но команды управления только для админа
  if (text === '/start') {
    await handleStart(chatId);
    return;
  }

  if (!isAdmin(userId)) {
    await sendMsg(chatId, '⛔ Доступ запрещён. Это приватный бот.');
    return;
  }

  const [cmd, ...rest] = text.split(' ');
  const args = rest.join(' ').trim();

  switch (cmd) {
    case '/help':        await sendMsg(chatId, HELP_TEXT); break;
    case '/status':      await handleStatus(chatId); break;
    case '/products':    await handleProducts(chatId); break;
    case '/setname':     await handleSetName(chatId, args); break;
    case '/settagline':  await handleSetTagline(chatId, args); break;
    case '/addproduct':  await handleAddProduct(chatId, args); break;
    case '/editproduct': await handleEditProduct(chatId, args); break;
    case '/delproduct':  await handleDelProduct(chatId, args); break;
    case '/toggleproduct': await handleToggleProduct(chatId, args); break;
    case '/setwallet':   await handleSetWallet(chatId, args); break;
    case '/reset':       await handleReset(chatId); break;
    default:
      await sendMsg(chatId, `❓ Неизвестная команда: ${cmd}\nИспользуйте /help`);
  }
}

async function poll() {
  try {
    const r = await fetch(`${TG}/getUpdates?offset=${offset}&timeout=25`);
    const { ok, result } = await r.json();
    if (ok && result.length) {
      for (const update of result) {
        offset = update.update_id + 1;
        await processUpdate(update);
      }
    }
  } catch(e) {
    console.error('Poll error:', e.message);
    await new Promise(res => setTimeout(res, 5000));
  }
  poll();
}

console.log('🌹 Roize Shop Bot запущен...');
console.log(`📡 Firebase: ${FIREBASE_URL.includes('YOUR') ? '⚠️  НЕ НАСТРОЕН' : '✅ OK'}`);
poll();
