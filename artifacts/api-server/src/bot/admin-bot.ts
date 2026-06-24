// ThinkSync Admin Telegram Bot
// Uses unified admin service for all operations

import { Bot, Context, Keyboard, InlineKeyboard } from 'grammy';
import { 
  isAdminByTelegramId, 
  hasPermission, 
  listAdmins, 
  createAdmin, 
  deleteAdmin, 
  Admin,
  AdminRole 
} from '../services/admin';
import { 
  listAllPaymentRequests, 
  approvePaymentRequest, 
  rejectPaymentRequest,
  getPaymentRequestById 
} from '../services/payment-request';
import { getUserById, updateUser, listUsers } from '../services/user';
import { getAllModels, updateModel, getModelById } from '../services/model';
import db from '../db';

// Bot configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('[BOT] TELEGRAM_BOT_TOKEN not set!');
  process.exit(1);
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

// =============================================================================
// MIDDLEWARE - Admin Check
// =============================================================================

async function requireAdmin(ctx: Context): Promise<Admin | null> {
  if (!ctx.from) return null;
  
  const admin = await isAdminByTelegramId(ctx.from.id);
  if (!admin || !admin.is_active) {
    return null;
  }
  
  return admin;
}

async function requireOwner(ctx: Context): Promise<Admin | null> {
  const admin = await requireAdmin(ctx);
  if (!admin || admin.role !== 'owner') {
    return null;
  }
  return admin;
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatUser(user: any): string {
  return `📧 ${user.email}\n💰 Balance: ${user.balance} tokens\n📊 Tier: ${user.tier_access || 'free'}`;
}

function formatPayment(payment: any): string {
  return `💰 Amount: ${payment.amount} tokens\n📸 Screenshot: ${payment.screenshot_url ? 'Yes' : 'No'}\n📌 Status: ${payment.status}\n📅 Created: ${new Date(payment.created_at).toLocaleString()}`;
}

function formatModel(model: any): string {
  return `🤖 ${model.name} (${model.slug})\n💰 Input: $${model.input_price_per_1m / 1000000 * 1e6}/M\n💰 Output: $${model.output_price_per_1m / 1000000 * 1e6}/M\n📌 Status: ${model.status}`;
}

// =============================================================================
// COMMAND HANDLERS
// =============================================================================

// /start - Welcome message
bot.command('start', async (ctx) => {
  const admin = await requireAdmin(ctx);
  
  if (!admin) {
    await ctx.reply('❌ Siz admin emassiz! Access rad etildi.');
    return;
  }
  
  await ctx.reply(
    `👋 Assalomu alaykum, ${admin.role}!\n\n` +
    `ThinkSync Admin Botga xush kelibsiz!\n\n` +
    `📋 Buyruqlar:\n` +
    `/start - Bosh sahifa\n` +
    `/payments - To'lovlarni boshqarish\n` +
    `/users - Foydalanuvchilar\n` +
    `/balance_add - Balans qo'shish\n` +
    `/balance_remove - Balans ayirish\n` +
    `/models - Modellar\n` +
    `/admins - Adminlar (FAQAT OWNER)\n` +
    `/stats - Statistika\n` +
    `/help - Yordam`
  );
});

// /help - Help
bot.command('help', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) {
    await ctx.reply('❌ Siz admin emassiz!');
    return;
  }
  
  await ctx.reply(
    `📚 ThinkSync Admin Bot\n\n` +
    `👮 Rollaringiz: ${admin.role}\n\n` +
    `Mavjud buyruqlar:\n` +
    `/payments - To'lovlarni ko'rish va qayta ishlash\n` +
    `/users - Foydalanuvchilar ro'yxati\n` +
    `/balance_add <user_id> <amount> - Balans qo'shish\n` +
    `/balance_remove <user_id> <amount> - Balans ayirish\n` +
    `/models - Model ro'yxati\n` +
    `/admins - Adminlar (faqat owner)\n` +
    `/stats - Tizim statistikasi`
  );
});

// /stats - System statistics
bot.command('stats', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) {
    await ctx.reply('❌ Siz admin emassiz!');
    return;
  }
  
  try {
    // Get stats from database
    const [userCount, activeUserCount, pendingPayments, completedPayments] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query("SELECT COUNT(*) as count FROM users WHERE last_login_at > NOW() - INTERVAL '30 days'"),
      db.query("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'completed'"),
    ]);
    
    const userStats = userCount.rows[0];
    const activeStats = activeUserCount.rows[0];
    const pendingStats = pendingPayments.rows[0];
    const completedStats = completedPayments.rows[0];
    
    await ctx.reply(
      `📊 Tizim Statistikasi\n\n` +
      `👥 Foydalanuvchilar: ${userStats.count}\n` +
      `🟢 Faol (30 kunda): ${activeStats.count}\n` +
      `⏳ Kutilayotgan to'lovlar: ${pendingStats.count}\n` +
      `✅ Tasdiqlangan to'lovlar: ${completedStats.count}`
    );
  } catch (error: any) {
    console.error('[BOT] Stats error:', error);
    await ctx.reply('❌ Xatolik yuz berdi!');
  }
});

// =============================================================================
// PAYMENTS
// =============================================================================

bot.command('payments', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'payments.list')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }
  
  try {
    const payments = await listAllPaymentRequests({ status: 'pending', limit: 10 });
    
    if (payments.length === 0) {
      await ctx.reply('📭 Kutilayotgan to\'lovlar yo\'q!');
      return;
    }
    
    for (const payment of payments) {
      const user = await getUserById(payment.user_id);
      const userInfo = user ? `👤 ${user.email}` : '👤 Noma\'lum';
      
      const keyboard = new InlineKeyboard()
        .text('✅ Tasdiqlash', `approve_${payment.id}`)
        .text('❌ Rad etish', `reject_${payment.id}`);
      
      await ctx.reply(
        `💰 To'lov #${payment.id.slice(0, 8)}\n` +
        `${userInfo}\n` +
        `💵 Summa: ${payment.amount} tokens\n` +
        `📌 Status: ${payment.status}\n` +
        `📅 Sana: ${new Date(payment.created_at).toLocaleString()}`,
        { reply_markup: keyboard }
      );
    }
  } catch (error: any) {
    console.error('[BOT] Payments error:', error);
    await ctx.reply('❌ Xatolik yuz berdi!');
  }
});

// Handle inline button callbacks for payments
bot.callbackQuery(/approve_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'payments.approve')) {
    await ctx.answerCallbackQuery('❌ Sizga ruxsat yo\'q!');
    return;
  }
  
  const paymentId = ctx.match[1];
  
  try {
    // Check payment exists
    const payment = await getPaymentRequestById(paymentId);
    if (!payment) {
      await ctx.answerCallbackQuery('❌ To\'lov topilmadi!');
      return;
    }
    
    if (payment.status !== 'pending') {
      await ctx.answerCallbackQuery('❌ Bu to\'lov allaqachon qayta ishlangan!');
      return;
    }
    
    // Confirm keyboard
    const keyboard = new InlineKeyboard()
      .text('✅ Ha, tasdiqlayman', `confirm_approve_${paymentId}`)
      .text('❌ Bekor qilish', `cancel_${paymentId}`);
    
    await ctx.editMessageText(
      `⚠️ To'lovni tasdiqlaysizmi?\n\n` +
      `💰 Summa: ${payment.amount} tokens\n` +
      `👤 User ID: ${payment.user_id.slice(0, 8)}...`,
      { reply_markup: keyboard }
    );
  } catch (error: any) {
    console.error('[BOT] Approve check error:', error);
    await ctx.answerCallbackQuery('❌ Xatolik!');
  }
});

bot.callbackQuery(/confirm_approve_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'payments.approve')) {
    await ctx.answerCallbackQuery('❌ Sizga ruxsat yo\'q!');
    return;
  }
  
  const paymentId = ctx.match[1];
  
  try {
    const result = await approvePaymentRequest(
      paymentId,
      admin.id,
      `telegram:${ctx.from?.id}`
    );
    
    if (result.success) {
      await ctx.editMessageText(`✅ To'lov tasdiqlandi!\n💰 Summa: ${result.payment?.amount} tokens`);
    } else {
      await ctx.editMessageText(`❌ Xatolik: ${result.error}`);
    }
  } catch (error: any) {
    console.error('[BOT] Approve error:', error);
    await ctx.editMessageText(`❌ Xatolik: ${error.message}`);
  }
});

bot.callbackQuery(/reject_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'payments.reject')) {
    await ctx.answerCallbackQuery('❌ Sizga ruxsat yo\'q!');
    return;
  }
  
  const paymentId = ctx.match[1];
  
  try {
    const payment = await getPaymentRequestById(paymentId);
    if (!payment || payment.status !== 'pending') {
      await ctx.answerCallbackQuery('❌ To\'lov topilmadi yoki allaqachon qayta ishlangan!');
      return;
    }
    
    // Reject directly
    const result = await rejectPaymentRequest(
      paymentId,
      admin.id,
      `telegram:${ctx.from?.id}`,
      'Rejected via Telegram bot'
    );
    
    if (result.success) {
      await ctx.editMessageText(`❌ To'lov rad etildi!`);
    } else {
      await ctx.editMessageText(`❌ Xatolik: ${result.error}`);
    }
  } catch (error: any) {
    console.error('[BOT] Reject error:', error);
    await ctx.editMessageText(`❌ Xatolik: ${error.message}`);
  }
});

// /balance_add command
bot.command('balance_add', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'balance.add')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }
  
  const args = ctx.message?.text.split(' ').slice(1);
  if (!args || args.length < 2) {
    await ctx.reply('❌ Noto\'g\'ri format!\nFormat: /balance_add <user_id> <amount>');
    return;
  }
  
  const userId = args[0];
  const amount = parseInt(args[1]);
  
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Noto\'g\'ri summa!');
    return;
  }
  
  try {
    const user = await getUserById(userId);
    if (!user) {
      await ctx.reply('❌ Foydalanuvchi topilmadi!');
      return;
    }
    
    const newBalance = (user.balance || 0) + amount;
    await updateUser(userId, { balance: newBalance });
    
    // Log action
    await db.query(
      `INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [require('crypto').randomUUID(), admin.id, `telegram:${ctx.from?.id}`, 'balance_added', 'user', userId, 
       `Added ${amount} tokens via Telegram`, new Date().toISOString()]
    );
    
    await ctx.reply(
      `✅ Balans qo'shildi!\n\n` +
      `👤 Foydalanuvchi: ${user.email}\n` +
      `💰 Oldingi: ${user.balance}\n` +
      `➕ Qo'shildi: ${amount}\n` +
      `💵 Yangi: ${newBalance}`
    );
  } catch (error: any) {
    console.error('[BOT] Balance add error:', error);
    await ctx.reply('❌ Xatolik yuz berdi!');
  }
});

// =============================================================================
// USERS
// =============================================================================

bot.command('users', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'users.list')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }
  
  try {
    const users = await listUsers({ limit: 10 });
    
    if (users.length === 0) {
      await ctx.reply('📭 Foydalanuvchilar yo\'q!');
      return;
    }
    
    let message = '👥 Oxirgi foydalanuvchilar:\n\n';
    for (const user of users) {
      message += `📧 ${user.email}\n`;
      message += `💰 Balans: ${user.balance}\n`;
      message += `🆔 ID: ${user.id.slice(0, 8)}...\n`;
      message += `---\n`;
    }
    
    await ctx.reply(message);
  } catch (error: any) {
    console.error('[BOT] Users error:', error);
    await ctx.reply('❌ Xatolik yuz berdi!');
  }
});

// =============================================================================
// MODELS
// =============================================================================

bot.command('models', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'models.view')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }
  
  try {
    const models = await getAllModels();
    
    if (models.length === 0) {
      await ctx.reply('📭 Modellar yo\'q!');
      return;
    }
    
    let message = '🤖 Mavjud modellar:\n\n';
    for (const model of models.slice(0, 10)) {
      message += `${model.status === 'active' ? '🟢' : '🔴'} ${model.name}\n`;
      message += `   Slug: ${model.slug}\n`;
      message += `   Status: ${model.status}\n`;
      message += `---\n`;
    }
    
    const keyboard = new InlineKeyboard()
      .text('📋 To\'liq ro\'yxat', 'models_list');
    
    await ctx.reply(message, { reply_markup: keyboard });
  } catch (error: any) {
    console.error('[BOT] Models error:', error);
    await ctx.reply('❌ Xatolik yuz berdi!');
  }
});

// =============================================================================
// ADMINS - Owner only
// =============================================================================

bot.command('admins', async (ctx) => {
  const admin = await requireOwner(ctx);
  if (!admin) {
    await ctx.reply('❌ Bu buyruq faqat owner uchun!');
    return;
  }
  
  try {
    const admins = await listAdmins({ limit: 20 });
    
    if (admins.length === 0) {
      await ctx.reply('📭 Adminlar yo\'q!');
      return;
    }
    
    let message = '👮 Adminlar ro\'yxati:\n\n';
    for (const a of admins) {
      message += `📌 ${a.role.toUpperCase()}\n`;
      if (a.email) message += `📧 ${a.email}\n`;
      if (a.telegram_id) message += `📱 TG: ${a.telegram_id}\n`;
      message += `🟢 Status: ${a.is_active ? 'Faol' : 'Nofaol'}\n`;
      message += `---\n`;
    }
    
    await ctx.reply(message);
  } catch (error: any) {
    console.error('[BOT] Admins error:', error);
    await ctx.reply('❌ Xatolik yuz berdi!');
  }
});

// =============================================================================
// CANCEL callback
// =============================================================================

bot.callbackQuery(/cancel_(.+)/, async (ctx) => {
  await ctx.answerCallbackQuery('Bekor qilindi');
  await ctx.editMessageText('❌ Bekor qilindi');
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

bot.catch((err) => {
  console.error('[BOT] Error:', err);
});

// =============================================================================
 // SETTINGS MANAGEMENT
 // =============================================================================

bot.command('settings', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'settings.view')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }

  try {
    const { getAllSettings, getPlatformFeatures } = await import('../services/platform-settings');
    const settings = await getAllSettings();
    const features = await getPlatformFeatures();

    let message = `⚙️ *Platforma Sozlamalari*\n\n`;
    message += `📱 *Funksiyalar:*\n`;
    message += `   👷 Maintenance: ${features.maintenanceMode ? '❌' : '✅'}\n`;
    message += `   📝 Ro'yxatdan o'tish: ${features.registrationEnabled ? '✅' : '❌'}\n`;
    message += `   💰 Depozitlar: ${features.depositsEnabled ? '✅' : '❌'}\n`;
    message += `   🤖 User Bot: ${features.userBotEnabled ? '✅' : '❌'}\n`;
    message += `   🤖 Admin Bot: ${features.adminBotEnabled ? '✅' : '❌'}\n\n`;
    message += `💳 *To'lov:*\n`;
    const payment = settings.find(s => s.key === 'payment_card_number');
    message += `   Karta: ${payment?.value || 'N/A'}\n\n`;
    message += `📧 *Qo'llab-quvvatlash:*\n`;
    const email = settings.find(s => s.key === 'support_email');
    const telegram = settings.find(s => s.key === 'support_telegram');
    message += `   Email: ${email?.value || 'N/A'}\n`;
    message += `   Telegram: ${telegram?.value || 'N/A'}\n\n`;
    message += `_To'liq ro'yxat uchun /settings_list_\n`;
    message += `_Sozlamani o\'zgartirish uchun /settings_edit_`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    console.error('[BOT] Settings error:', error);
    await ctx.reply('❌ Xatolik yuz berdi!');
  }
});

bot.command('settings_list', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) { await ctx.reply('❌ Siz admin emassiz!'); return; }

  try {
    const { getAllSettings } = await import('../services/platform-settings');
    const settings = await getAllSettings();

    let message = `📋 *Barcha Sozlamalar:*\n\n`;
    for (const s of settings) {
      const displayVal = s.key.includes('card') || s.key.includes('phone') 
        ? s.value?.replace(/\d(?=\d{4})/g, '*') 
        : s.value;
      message += `• *${s.key}*: \`${displayVal || 'N/A'}\`\n`;
      if (s.description) message += `  └ ${s.description}\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

bot.command('settings_edit', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || admin.role !== 'owner') {
    await ctx.reply('❌ Faqat owner sozlamalarni o\'zgartirishi mumkin!');
    return;
  }

  const args = ctx.message?.text.split(' ').slice(1);
  if (!args || args.length < 2) {
    await ctx.reply(`📝 *Sozlamani o'zgartirish:*\n\n` +
      `/settings_edit <key> <value>\n\n` +
      `Misol:\n` +
      `/settings_edit payment_card_number 8600123456789012\n` +
      `/settings_edit maintenance_mode false\n` +
      `/settings_edit deposits_enabled true`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const key = args[0];
  const value = args.slice(1).join(' ');

  try {
    const { setSetting } = await import('../services/platform-settings');
    await setSetting(key, value, { updated_by: admin.user_id });
    
    await ctx.reply(`✅ *Sozlama yangilandi!*\n\n` +
      `Key: ${key}\n` +
      `Value: ${value}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

// =============================================================================
// TIER MANAGEMENT
// =============================================================================

bot.command('tiers', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'tiers.view')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }

  try {
    const { getAllTiers } = await import('../services/tier');
    const tiers = await getAllTiers();

    let message = `🏆 *Tiers:*\n\n`;
    for (const tier of tiers) {
      const status = tier.is_active ? '🟢' : '🔴';
      message += `${status} *${tier.display_name}* (${tier.name})\n`;
      message += `   RPM: ${tier.rpm_limit} | TPM: ${tier.tpm_limit}\n`;
      message += `   Oylik: ${tier.monthly_request_limit} so'rov, ${tier.monthly_token_limit} token\n`;
      message += `   API Keys: ${tier.max_api_keys ?? '∞'}\n`;
      message += `   Min spend: $${tier.minimum_lifetime_spend_usd}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

bot.command('tier_create', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || admin.role !== 'owner') {
    await ctx.reply('❌ Faqat owner tier yarata oladi!');
    return;
  }

  const args = ctx.message?.text.split(' ').slice(1);
  if (!args || args.length < 3) {
    await ctx.reply(`🏆 *Tier yaratish:*\n\n` +
      `/tier_create <name> <display_name> <priority> [rpm] [tpm]\n\n` +
      `Misol:\n` +
      `/tier_create vip VIP 4 2000 200000`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    const { createTier } = await import('../services/tier');
    const tier = await createTier({
      name: args[0],
      display_name: args[1],
      priority: parseInt(args[2]) || 0,
      rpm_limit: parseInt(args[3]) || 60,
      tpm_limit: parseInt(args[4]) || 60000,
    });
    
    await ctx.reply(`✅ *Tier yaratildi!*\n\n` +
      `Name: ${tier.name}\n` +
      `Display: ${tier.display_name}\n` +
      `Priority: ${tier.priority}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

bot.command('tier_assign', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'tiers.edit')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }

  const args = ctx.message?.text.split(' ').slice(1);
  if (!args || args.length < 2) {
    await ctx.reply(`🏆 *Tier biriktirish:*\n\n` +
      `/tier_assign <email> <tier_name> [auto|manual]\n\n` +
      `Misol:\n` +
      `/tier_assign user@example.com pro manual`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    const { getUserByEmail } = await import('../services/user');
    const { getTierByName, assignTierToUser } = await import('../services/tier');
    
    const user = getUserByEmail(args[0]);
    if (!user) {
      await ctx.reply('❌ Foydalanuvchi topilmadi!');
      return;
    }

    const tier = await getTierByName(args[1]);
    if (!tier) {
      await ctx.reply('❌ Tier topilmadi!');
      return;
    }

    const mode = args[2] as 'auto' | 'manual' || 'manual';
    await assignTierToUser(user.id, tier.id, mode);
    
    await ctx.reply(`✅ *Tier biriktirildi!*\n\n` +
      `Foydalanuvchi: ${user.email}\n` +
      `Tier: ${tier.display_name}\n` +
      `Mode: ${mode}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

// =============================================================================
// PACKAGE MANAGEMENT
// =============================================================================

bot.command('packages', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'packages.view')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }

  try {
    const { listPackages } = await import('../services/package');
    const packages = await listPackages({});

    let message = `📦 *Packages:*\n\n`;
    for (const pkg of packages) {
      const status = pkg.status === 'active' ? '🟢' : '🔴';
      const featured = pkg.is_featured ? '⭐' : '';
      message += `${status}${featured} *${pkg.name}*\n`;
      message += `   Tokens: ${pkg.token_amount.toLocaleString()}`;
      if (pkg.bonus_tokens > 0) message += ` + ${pkg.bonus_tokens.toLocaleString()} bonus`;
      message += `\n`;
      message += `   Price: $${(pkg.price_usd_cents / 100).toFixed(2)}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

// =============================================================================
// PROMOCODE MANAGEMENT
// =============================================================================

bot.command('promocodes', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'promocodes.view')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }

  try {
    const { listPromocodes } = await import('../services/promocode');
    const promos = listPromocodes({});

    let message = `🎫 *Promocodes:*\n\n`;
    for (const promo of promos) {
      const status = promo.is_active ? '🟢' : '🔴';
      message += `${status} *${promo.code}*\n`;
      message += `   Discount: ${promo.discount_percent}%\n`;
      message += `   Uses: ${promo.used_count}/${promo.max_uses || '∞'}\n`;
      if (promo.expires_at) {
        message += `   Expires: ${new Date(promo.expires_at).toLocaleDateString()}\n`;
      }
      message += '\n';
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

bot.command('promocode_create', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || admin.role !== 'owner') {
    await ctx.reply('❌ Faqat owner promocode yarata oladi!');
    return;
  }

  const args = ctx.message?.text.split(' ').slice(1);
  if (!args || args.length < 3) {
    await ctx.reply(`🎫 *Promocode yaratish:*\n\n` +
      `/promocode_create <code> <discount%> <max_uses> [expires_days]\n\n` +
      `Misol:\n` +
      `/promocode_create SUMMER20 20 100 30`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    const { createPromocode } = await import('../services/promocode');
    const expiresIn = parseInt(args[3]) || null;
    
    const promo = createPromocode({
      code: args[0].toUpperCase(),
      discount_percent: parseInt(args[1]),
      max_uses: parseInt(args[2]),
      expires_at: expiresIn ? new Date(Date.now() + expiresIn * 86400000).toISOString() : undefined,
      is_active: true,
    });
    
    await ctx.reply(`✅ *Promocode yaratildi!*\n\n` +
      `Code: ${promo.code}\n` +
      `Discount: ${promo.discount_percent}%\n` +
      `Max uses: ${promo.max_uses}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

// =============================================================================
// TRANSACTIONS MANAGEMENT
// =============================================================================

bot.command('transactions', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'transactions.view')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }

  const args = ctx.message?.text.split(' ');
  const email = args?.[1];
  const limit = parseInt(args?.[2] || '10');

  try {
    const { listTransactions } = await import('../services/transaction');
    const { getUserByEmail } = await import('../services/user');
    
    let userId: string | undefined;
    if (email) {
      const user = getUserByEmail(email);
      if (user) userId = user.id;
    }

    const txs = listTransactions(userId).slice(0, limit);

    if (txs.length === 0) {
      await ctx.reply('📭 Tranzaksiyalar topilmadi!');
      return;
    }

    let message = `💸 *Tranzaksiyalar:*\n\n`;
    for (const tx of txs) {
      const date = new Date(tx.created_at).toLocaleDateString();
      const type = tx.type === 'credit' ? '💰' : '💸';
      message += `${type} *${tx.type}* | ${tx.amount.toLocaleString()} | ${date}\n`;
      message += `   ${tx.description || '-'}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

// =============================================================================
// MODEL PRICING MANAGEMENT
// =============================================================================

bot.command('model_pricing', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'models.edit')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }

  const args = ctx.message?.text.split(' ').slice(1);
  
  try {
    const { getAllModels, updateModel } = await import('../services/model');

    // List models with pricing
    if (!args || args.length === 0) {
      const models = await getAllModels({ is_active: true });
      
      let message = `💰 *Model Narxlari:*\n\n`;
      for (const m of models.slice(0, 10)) {
        message += `*${m.display_name}*\n`;
        message += `   Input: $${m.pricing_input_per_m}/1M\n`;
        message += `   Output: $${m.pricing_output_per_m}/1M\n`;
        message += `   RPM: ${m.rate_limit_rpm} | TPM: ${m.rate_limit_tpm}\n`;
        message += `   Tier: ${m.tier_access}\n\n`;
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
      return;
    }

    // Update model pricing: /model_pricing <slug> input <value>
    if (args.length >= 3) {
      const slug = args[0];
      const field = args[1];
      const value = args[2];

      const allowedFields = ['pricing_input_per_m', 'pricing_output_per_m', 'rate_limit_rpm', 'rate_limit_tpm', 'tier_access'];
      if (!allowedFields.includes(field)) {
        await ctx.reply('❌ Noto\'g\'ri maydon. Ruxsat berilgan: ' + allowedFields.join(', '));
        return;
      }

      const model = await updateModel(slug, { [field]: field === 'tier_access' ? value : parseInt(value) });
      
      await ctx.reply(`✅ *Model yangilandi!*\n\n` +
        `Model: ${model.display_name}\n` +
        `${field}: ${value}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

// =============================================================================
// BROADCAST / NOTIFICATIONS
// =============================================================================

bot.command('broadcast', async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, 'broadcast')) {
    await ctx.reply('❌ Sizga ruxsat yo\'q!');
    return;
  }

  const args = ctx.message?.text.split(' ').slice(1);
  if (!args || args.length < 2) {
    await ctx.reply(`📢 *Broadcast yuborish:*\n\n` +
      `/broadcast <user_email|all> <xabar>\n\n` +
      `Misol:\n` +
      `/broadcast all Salom hamma!` +
      `/broadcast user@example.com Salom!`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const target = args[0];
  const message = args.slice(1).join(' ');

  try {
    const { listUsers } = await import('../services/user');
    const { createNotification } = await import('../services/notification');
    
    let users: any[] = [];

    if (target === 'all') {
      users = listUsers();
    } else {
      const { getUserByEmail } = await import('../services/user');
      const user = getUserByEmail(target);
      if (user) users = [user];
    }

    let sent = 0;
    for (const user of users) {
      await createNotification({
        user_id: user.id,
        type: 'broadcast',
        title: '📢 Admin xabari',
        message: message,
      });
      sent++;
    }

    await ctx.reply(`✅ *Broadcast yuborildi!*\n\n` +
      `Qabul qiluvchilar: ${sent}\n` +
      `Xabar: ${message}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error: any) {
    await ctx.reply('❌ Xatolik: ' + error.message);
  }
});

// =============================================================================
// START BOT
// =============================================================================

export async function startBot(): Promise<void> {
  console.log('[BOT] Starting ThinkSync Admin Bot...');
  await bot.init();
  console.log(`[BOT] Bot started as @${bot.botInfo?.username}`);
  bot.start();
}

// =============================================================================
// NOTIFY NEW PAYMENT REQUEST (called from API routes)
// =============================================================================

export async function notifyNewPaymentRequest(payment: any, userEmail: string): Promise<void> {
  try {
    // Get all admins
    const admins = await listAdmins({ is_active: true });
    
    const message = `💰 *Yangi To'lov So'rovi*\n\n` +
      `👤 *Foydalanuvchi:* ${userEmail}\n` +
      `💵 *Summa:* ${payment.amount} ${payment.currency}\n` +
      `📱 *Manba:* ${payment.source || 'frontend'}\n` +
      `🕐 *Vaqt:* ${new Date(payment.created_at).toLocaleString()}\n\n` +
      `Kuzatuvchi: /payments`;
    
    // Send to all admins via bot
    for (const admin of admins) {
      if (admin.telegram_id) {
        try {
          await bot.api.sendMessage(admin.telegram_id, message, {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('✅ Tasdiqlash', `approve_${payment.id}`)
              .text('❌ Bekor qilish', `reject_${payment.id}`)
          });
        } catch (err) {
          console.error(`[BOT] Failed to notify admin ${admin.telegram_id}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('[BOT] notifyNewPaymentRequest error:', error);
  }
}

// Export bot instance for direct API access
export { bot };

export default { startBot };