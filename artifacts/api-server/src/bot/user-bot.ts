// ThinkSync User Telegram Bot
// Provides account access, balance, API keys, payment workflow for users

import { Bot, Context, Keyboard, InlineKeyboard } from 'grammy';
import { 
  getUserByTelegramId, 
  createLinkingCode, 
  linkTelegramAccount, 
  updateLastSeen,
  TelegramAccount 
} from '../services/telegram-account';
import { getUserById, updateUser } from '../services/user';
import { listApiKeysForUser, createApiKey, revokeApiKey } from '../services/api-key';
import { listTransactionsForUser, getCurrentBalance, getTotalSpentByUser } from '../services/transaction';
import { createPaymentRequest, listPaymentRequestsForUser } from '../services/payment-request';
import { listModels } from '../services/model';
import { getPaymentCardInfo, getPlatformUrls, getSupportInfo } from '../services/platform-settings';
import { randomUUID } from 'crypto';
import db from '../db';

// Bot configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_USER_BOT_TOKEN;
const THINKSYNC_API_URL = process.env.THINKSYNC_API_URL || 'https://api.thinksync.art';
const WEBSITE_URL = process.env.THINKSYNC_WEBSITE_URL || 'https://models.thinksync.art';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('[USER_BOT] TELEGRAM_USER_BOT_TOKEN not set!');
  process.exit(1);
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

// =============================================================================
// MIDDLEWARE - User Check
// =============================================================================

interface UserSession {
  state?: string;
  amount?: number;
  data?: any;
}

const sessions = new Map<number, UserSession>();

async function getLinkedUser(ctx: Context) {
  if (!ctx.from) return null;
  const user = await getUserByTelegramId(ctx.from.id);
  if (user) {
    await updateLastSeen(ctx.from.id);
  }
  return user;
}

async function requireLinkedUser(ctx: Context) {
  const user = await getLinkedUser(ctx);
  if (!user) {
    await ctx.reply(
      '❌ Siz hisobingizni Telegramga ulamagansiz!\n\n' +
      'Qadamlar:\n' +
      '1. Saytga kiring: /website\n' +
      '2. Hisob sozlamalarida "Telegram ulash" tugmasini bosing\n' +
      '3. Kodni shu botga yuboring'
    );
    return null;
  }
  return user;
}

// =============================================================================
// MAIN MENU
// =============================================================================

function getMainMenuKeyboard() {
  const keyboard = new Keyboard()
    .text('🏠 Account').text('💳 Balance')
    .row()
    .text('🔑 API Keys').text('💰 Deposit')
    .row()
    .text('📊 Usage').text('📚 Docs')
    .row()
    .text('🌐 Open Website').text('🆘 Support');
  return keyboard;
}

// =============================================================================
// START & HELP
// =============================================================================

bot.command('start', async (ctx) => {
  const user = await getLinkedUser(ctx);
  
  if (user) {
    await ctx.reply(
      `👋 Assalomu alaykum, ${user.email}!\n\n` +
      `ThinkSync User Botga xush kelibsiz!\n\n` +
      `Kerakli bo'limni tanlang:`,
      { reply_markup: getMainMenuKeyboard() }
    );
  } else {
    await ctx.reply(
      `👋 Assalomu alaykum!\n\n` +
      `ThinkSync User Bot - bu hisobingizni boshqarish uchun bot.\n\n` +
      `Boshish uchun hisobingizni Telegramga ulashing kerak:\n\n` +
      `1. Saytga kiring: /website\n` +
      `2. Hisob sozlamalarida "Telegram ulash" tugmasini bosing\n` +
      `3. 16 xonali kodni shu botga yuboring\n\n` +
      `Yoki yangi hisob yaratmoqchi bo'lsangiz, saytga o'ting.`
    );
  }
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `📚 ThinkSync User Bot yordam\n\n` +
    `Buyruqlar:\n` +
    `/start - Bosh sahifa\n` +
    `/account - Hisob ma'lumotlari\n` +
    `/balance - Balans ma'lumotlari\n` +
    `/apikeys - API kalitlar\n` +
    `/deposit - To'lov qilish\n` +
    `/usage - Foydalanish statistikasi\n` +
    `/docs - Hujjatlar\n` +
    `/website - Saytga o'tish\n` +
    `/support - Qo'llab-quvvatlash\n\n` +
    `Menu orqali ham foydalanishingiz mumkin.`
  );
});

// =============================================================================
// LINK COMMAND
// =============================================================================

bot.command('link', async (ctx) => {
  if (!ctx.from) return;
  
  const user = await getLinkedUser(ctx);
  if (user) {
    await ctx.reply(`✅ Siz allaqachon ulagansiz!\n\nEmail: ${user.email}\nBalans: ${user.balance}`);
    return;
  }
  
  // Ask for linking code
  sessions.set(ctx.from.id, { state: 'waiting_link_code' });
  await ctx.reply(
    `🔗 Hisobni ulash\n\n` +
    `Iltimos, 16 xonali ulash kodini yuboring.\n\n` +
    `Kodni hisob sozlamalaridan olishingiz mumkin.`
  );
});

// Handle text messages for linking
bot.on('message:text', async (ctx) => {
  if (!ctx.from) return;
  
  const session = sessions.get(ctx.from.id);
  if (!session) return;
  
  if (session.state === 'waiting_link_code') {
    const code = ctx.message.text.trim().toUpperCase();
    
    if (code.length !== 16) {
      await ctx.reply('❌ Noto\'g\'ri kod formati! 16 ta belgi kerak.');
      return;
    }
    
    const result = await linkTelegramAccount(code, ctx.from.id, ctx.from.username);
    
    if (result.success) {
      sessions.delete(ctx.from.id);
      await ctx.reply(
        `✅ Hisob muvaffaqiyatli ulandi!\n\n` +
        `Email: ${result.user?.email}\n` +
        `Balans: ${result.user?.balance}\n\n` +
        `Endi botdan to'liq foydalanishingiz mumkin!`,
        { reply_markup: getMainMenuKeyboard() }
      );
    } else {
      await ctx.reply(`❌ Xatolik: ${result.error}`);
    }
  }
  
  else if (session.state === 'waiting_deposit_amount') {
      const amount = parseInt(ctx.message.text.trim());

      if (isNaN(amount) || amount < 1000) {
        await ctx.reply('❌ Noto\'g\'ri summa! Minimum 1000 token.');
        return;
      }

      // Get payment card info from platform settings
      const cardInfo = await getPaymentCardInfo();

      sessions.set(ctx.from.id, { state: 'waiting_screenshot', amount });
    
    await ctx.reply(
      `💰 To'lov summasi: ${amount} tokens\n\n` +
      `To'lovni quyidagi karta raqamiga bajaring:\n\n` +
      `💳 Card: ${cardInfo.number}\n` +
      `👤 Name: ${cardInfo.holder}\n` +
      `📱 Phone: ${cardInfo.phone}\n\n` +
      `To'lovni amalga oshirgandan so'ng, ` +
      `"To'lov qildim" deb yozing va screenshotni yuboring.`
    );
  }
  
  else if (session.state === 'waiting_screenshot_confirm') {
    const confirm = ctx.message.text.toLowerCase();
    
    if (confirm.includes('ha') || confirm === 'tugadi' || confirm === 'done') {
      sessions.delete(ctx.from.id);
      await ctx.reply(
        `📸 Iltimos, to'lov skrinshotini yuboring.`
      );
    } else {
      await ctx.reply('Iltimos, skrinshotni yuboring yoki "Bekor qilish" deb yozing.');
    }
  }
});

// =============================================================================
// ACCOUNT
// =============================================================================

bot.command('account', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;
  
  await ctx.reply(
    `🏠 Hisob Ma'lumotlari\n\n` +
    `📧 Email: ${user.email}\n` +
    `💰 Balans: ${user.balance} tokens\n` +
    `📊 Tier: ${user.plan_tier || 'free'}\n` +
    `✅ Status: ${user.is_active ? 'Faol' : 'Nofaol'}\n` +
    `📅 Ro'yxatdan o'tgan: ${new Date(user.created_at).toLocaleDateString()}`
  );
});

// =============================================================================
// BALANCE
// =============================================================================

bot.command('balance', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;
  
  const userId = user.id;
  const currentBalance = await getCurrentBalance(userId);
  const totalSpent = await getTotalSpentByUser(userId);
  
  const transactions = await listTransactionsForUser(userId, { limit: 5 });
  
  let message = `💳 Balans Ma'lumotlari\n\n`;
  message += `💰 Joriy balans: ${currentBalance} tokens\n`;
  message += `💳 Jami sarflangan: ${totalSpent} tokens\n\n`;
  message += `Oxirgi tranzaksiyalar:\n`;
  
  if (transactions.length === 0) {
    message += `Tranzaksiyalar yo'q`;
  } else {
    for (const tx of transactions) {
      const sign = tx.amount > 0 ? '+' : '';
      message += `${sign}${tx.amount} - ${tx.transaction_type} (${new Date(tx.created_at).toLocaleDateString()})\n`;
    }
  }
  
  await ctx.reply(message);
});

// =============================================================================
// API KEYS
// =============================================================================

bot.command('apikeys', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;
  
  const keys = await listApiKeysForUser(user.id);
  
  if (keys.length === 0) {
    const keyboard = new InlineKeyboard().text('➕ Yangi kalit yaratish', 'create_apikey');
    
    await ctx.reply(
      `🔑 API Kalitlar\n\n` +
      `Sizda hali API kalitlar yo'q.\n\n` +
      `API kalit yaratish uchun quyidagi tugmani bosing:`,
      { reply_markup: keyboard }
    );
    return;
  }
  
  let message = `🔑 Sizning API Kalitlaringiz\n\n`;
  
  for (const key of keys) {
    message += `• ${key.name}\n`;
    message += `  Key: ${key.key_prefix}...\n`;
    message += `  Status: ${key.status}\n`;
    message += `  Created: ${new Date(key.created_at).toLocaleDateString()}\n\n`;
  }
  
  const keyboard = new InlineKeyboard()
    .text('➕ Yangi kalit', 'create_apikey');
  
  await ctx.reply(message, { reply_markup: keyboard });
});

bot.callbackQuery('create_apikey', async (ctx) => {
  const user = await getLinkedUser(ctx);
  if (!user) {
    await ctx.answerCallbackQuery('❌ Hisobingizni ulashing kerak!');
    return;
  }
  
  const newKey = await createApiKey({
    profile_id: user.id,
    name: 'Telegram Bot',
  });
  
  await ctx.editMessageText(
    `✅ Yangi API kalit yaratildi!\n\n` +
    `🔑 Kalit: \`${newKey.key}\`\n\n` +
    `⚠️ Bu kalitni bir marta ko'rsatiladi!\n` +
    `Iltimos, uni xavfsiz saqlang.`,
    { parse_mode: 'Markdown' }
  );
});

// =============================================================================
// DEPOSIT
// =============================================================================

bot.command('deposit', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;
  
  sessions.set(ctx.from.id, { state: 'waiting_deposit_amount' });
  
  await ctx.reply(
    `💰 depozit Qilish\n\n` +
    `Iltimos, qancha token sotib olmoqchi ekanligingizni yozing.\n\n` +
    `Misol: 10000\n` +
    `(Minimal 1000 token)`
  );
});

// Handle "To'lov qildim" response
bot.command('payment_done', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;
  
  const session = sessions.get(ctx.from.id);
  
  if (session?.state === 'waiting_screenshot' || session?.amount) {
    await ctx.reply(
      `📸 Iltimos, to'lov skrinshotini shu yerga yuboring.`
    );
  } else {
    await ctx.reply(
      `Iltimos avval /deposit buyrug'ini bosing va summani kiriting.`
    );
  }
});

// Handle photo uploads for payment screenshots
bot.on('message:photo', async (ctx) => {
  const user = await getLinkedUser(ctx);
  if (!user) return;
  
  const session = sessions.get(ctx.from.id);
  
  if (session?.state === 'waiting_screenshot' && session?.amount) {
    // Get photo file ID
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;
    
    // Create payment request (with placeholder URL - in real implementation would upload to storage)
    const payment = await createPaymentRequest({
      user_id: user.id,
      amount: session.amount,
      screenshot_url: `telegram://${fileId}`,
    });
    
    sessions.delete(ctx.from.id);
    
    await ctx.reply(
      `✅ To'lov so'rovi yaratildi!\n\n` +
      `💰 Summa: ${session.amount} tokens\n` +
      `🆔 ID: ${payment.id.slice(0, 8)}\n\n` +
      `Hozircha adminlarga ko'rsatiladi. To'lov tasdiqlangandan so'ng ` +
      `balansingizga o'tkaziladi.`
    );
  }
});

// =============================================================================
// USAGE
// =============================================================================

bot.command('usage', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;
  
  // Get usage stats from API logs
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  monthAgo.setHours(0, 0, 0, 0);
  
  const todayStats = await db.query(
    `SELECT 
       COUNT(*) as requests,
       COALESCE(SUM(total_tokens), 0) as tokens,
       COALESCE(SUM(total_cost), 0) as cost
     FROM api_logs 
     WHERE profile_id = $1 AND created_at >= $2`,
    [user.id, today.toISOString()]
  );
  
  const monthStats = await db.query(
    `SELECT 
       COUNT(*) as requests,
       COALESCE(SUM(total_tokens), 0) as tokens,
       COALESCE(SUM(total_cost), 0) as cost
     FROM api_logs 
     WHERE profile_id = $1 AND created_at >= $2`,
    [user.id, monthAgo.toISOString()]
  );
  
  const todayData = todayStats.rows[0];
  const monthData = monthStats.rows[0];
  
  await ctx.reply(
    `📊 Foydalanish Statistikasi\n\n` +
    `📅 Bugun:\n` +
    `  So'rovlar: ${todayData.requests}\n` +
    `  Tokenlar: ${todayData.tokens}\n` +
    `  Xarajat: ${todayData.cost} tokens\n\n` +
    `📆 Oy ichida:\n` +
    `  So'rovlar: ${monthData.requests}\n` +
    `  Tokenlar: ${monthData.tokens}\n` +
    `  Xarajat: ${monthData.cost} tokens`
  );
});

// =============================================================================
// DOCUMENTATION
// =============================================================================

bot.command('docs', async (ctx) => {
  const models = await listModels({ status: 'active' });
  
  let message = `📚 Hujjatlar\n\n`;
  message += `🌐 API: ${THINKSYNC_API_URL}\n`;
  message += `📖 Hujjatlar: ${WEBSITE_URL}/docs\n`;
  message += `🤖 Modellar: ${WEBSITE_URL}/models\n\n`;
  message += `Mavjud modellar:\n`;
  
  for (const model of models.slice(0, 5)) {
    message += `• ${model.name} (${model.slug})\n`;
  }
  
  if (models.length > 5) {
    message += `\n...va yana ${models.length - 5} ta model`;
  }
  
  const keyboard = new InlineKeyboard()
    .text('📖 To\'liq hujjatlar', 'open_docs')
    .text('🤖 Modellar ro\'yxati', 'open_models');
  
  await ctx.reply(message, { reply_markup: keyboard });
});

bot.callbackQuery('open_docs', async (ctx) => {
  await ctx.answerCallbackQuery(`${WEBSITE_URL}/docs`);
});

bot.callbackQuery('open_models', async (ctx) => {
  await ctx.answerCallbackQuery(`${WEBSITE_URL}/models`);
});

// =============================================================================
// WEBSITE
// =============================================================================

bot.command('website', async (ctx) => {
  await ctx.reply(
    `🌐 ThinkSync Saytlari\n\n` +
    `📡 API: api.thinksync.art\n` +
    `🤖 Modellar: models.thinksync.art\n` +
    `💻 Boshqaruv: admin.thinksync.art\n\n` +
    `Saytga o'tish uchun yuqoridagi havolalardan foydalaning.`
  );
});

// =============================================================================
// SUPPORT
// =============================================================================

bot.command('support', async (ctx) => {
  await ctx.reply(
    `🆘 Qo'llab-quvvatlash\n\n` +
    `📧 Email: support@thinksync.art\n` +
    `💬 Telegram: @thinksync_support\n` +
    `🌐 Website: ${WEBSITE_URL}/support\n\n` +
    `Muammolar bo'lista, biz bilan bog'laning!`
  );
});

// =============================================================================
// KEYBOARD BUTTON HANDLERS
// =============================================================================

bot.hear('🏠 Account', async (ctx) => {
  ctx.message = undefined; // Hack to reuse command
  await ctx.reply('command sent'); // Dummy response
  bot.command.account.handle(ctx);
});

bot.hear('💳 Balance', async (ctx) => {
  ctx.message = undefined;
  await ctx.reply('command sent');
  bot.command.balance.handle(ctx);
});

bot.hear('🔑 API Keys', async (ctx) => {
  ctx.message = undefined;
  await ctx.reply('command sent');
  bot.command.apikeys.handle(ctx);
});

bot.hear('💰 Deposit', async (ctx) => {
  ctx.message = undefined;
  await ctx.reply('command sent');
  bot.command.deposit.handle(ctx);
});

bot.hear('📊 Usage', async (ctx) => {
  ctx.message = undefined;
  await ctx.reply('command sent');
  bot.command.usage.handle(ctx);
});

bot.hear('📚 Docs', async (ctx) => {
  ctx.message = undefined;
  await ctx.reply('command sent');
  bot.command.docs.handle(ctx);
});

bot.hear('🌐 Open Website', async (ctx) => {
  ctx.message = undefined;
  await ctx.reply('command sent');
  bot.command.website.handle(ctx);
});

bot.hear('🆘 Support', async (ctx) => {
  ctx.message = undefined;
  await ctx.reply('command sent');
  bot.command.support.handle(ctx);
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

bot.catch((err) => {
  console.error('[USER_BOT] Error:', err);
});

// =============================================================================
// START BOT
// =============================================================================

export async function startUserBot(): Promise<void> {
  console.log('[USER_BOT] Starting ThinkSync User Bot...');
  await bot.init();
  console.log(`[USER_BOT] Bot started as @${bot.botInfo?.username}`);
  bot.start();
}

export default { startUserBot };