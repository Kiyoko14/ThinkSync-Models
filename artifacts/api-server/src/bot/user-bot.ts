// @ts-nocheck
// ThinkSync User Telegram Bot
// Provides account access, balance, API keys, payment workflow for users
// Phase 9: Multilingual support, proper website button, fixed onboarding

import "dotenv/config";
import { Bot, Context, Keyboard, InlineKeyboard } from "grammy";
import {
  getUserByTelegramId,
  createLinkingCode,
  linkTelegramAccount,
  updateLastSeen,
  updateLanguage,
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
import crypto from 'crypto';

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
// MULTILINGUAL SUPPORT
// =============================================================================

type Language = 'uz' | 'ru' | 'en';

interface Translations {
  [key: string]: {
    uz: string;
    ru: string;
    en: string;
  };
}

const t: Translations = {
  welcome: {
    uz: '👋 Assalomu alaykum! ThinkSync User Botga xush kelibsiz!',
    ru: '👋 Здравствуйте! Добро пожаловать в ThinkSync User Bot!',
    en: '👋 Hello! Welcome to ThinkSync User Bot!'
  },
  select_language: {
    uz: '🌐 Tilni tanlang / Выберите язык / Select language:',
    ru: '🌐 Tilni tanlang / Выберите язык / Select language:',
    en: '🌐 Tilni tanlang / Выберите язык / Select language:'
  },
  language_selected: {
    uz: '✅ Til tanlandi: O\'zbek tili',
    ru: '✅ Язык выбран: Русский',
    en: '✅ Language selected: English'
  },
  account_linked: {
    uz: '✅ Hisob muvaffaqiyatli ulandi!',
    ru: '✅ Аккаунт успешно привязан!',
    en: '✅ Account successfully linked!'
  },
  not_linked: {
    uz: '❌ Siz hisobingizni Telegramga ulamagansiz!',
    ru: '❌ Вы не привязали свой аккаунт к Telegram!',
    en: '❌ You haven\'t linked your account to Telegram!'
  },
  link_instructions: {
    uz: 'Boshlash uchun hisobingizni Telegramga ulashingiz kerak.',
    ru: 'Чтобы начать, вам нужно привязать аккаунт к Telegram.',
    en: 'To get started, you need to link your account to Telegram.'
  },
  link_step1: {
    uz: '1. Saytga kiring: ' + WEBSITE_URL,
    ru: '1. Зайдите на сайт: ' + WEBSITE_URL,
    en: '1. Go to the website: ' + WEBSITE_URL
  },
  link_step2: {
    uz: '2. Hisob sozlamalarida "Telegram ulash" tugmasini bosing',
    ru: '2. Нажмите кнопку "Привязать Telegram" в настройках аккаунта',
    en: '2. Click "Link Telegram" in account settings'
  },
  link_step3: {
    uz: '3. 16 xonali kodni shu botga yuboring',
    ru: '3. Отправьте 16-значный код этому боту',
    en: '3. Send the 16-digit code to this bot'
  },
  main_menu: {
    uz: 'Kerakli bo\'limni tanlang:',
    ru: 'Выберите нужный раздел:',
    en: 'Select the section you need:'
  },
  account_info: {
    uz: '🏠 Hisob Ma\'lumotlari',
    ru: '🏠 Информация об аккаунте',
    en: '🏠 Account Information'
  },
  balance_info: {
    uz: '💳 Balans Ma\'lumotlari',
    ru: '💳 Информация о балансе',
    en: '💳 Balance Information'
  },
  api_keys: {
    uz: '🔑 API Kalitlar',
    ru: '🔑 API Ключи',
    en: '🔑 API Keys'
  },
  deposit: {
    uz: '💰 Depozit Qilish',
    ru: '💰 Пополнить баланс',
    en: '💰 Deposit'
  },
  usage: {
    uz: '📊 Foydalanish Statistikasi',
    ru: '📊 Статистика использования',
    en: '📊 Usage Statistics'
  },
  docs: {
    uz: '📚 Hujjatlar',
    ru: '📚 Документация',
    en: '📚 Documentation'
  },
  website: {
    uz: '🌐 Saytga o\'tish',
    ru: '🌐 Перейти на сайт',
    en: '🌐 Open Website'
  },
  support: {
    uz: '🆘 Qo\'llab-quvvatlash',
    ru: '🆘 Поддержка',
    en: '🆘 Support'
  },
  help: {
    uz: '📚 ThinkSync User Bot yordam',
    ru: '📚 Помощь ThinkSync User Bot',
    en: '📚 ThinkSync User Bot Help'
  },
  commands: {
    uz: 'Buyruqlar:\\n/start - Bosh sahifa\\n/account - Hisob ma\'lumotlari\\n/balance - Balans ma\'lumotlari\\n/apikeys - API kalitlar\\n/deposit - To\'lov qilish\\n/usage - Foydalanish statistikasi\\n/docs - Hujjatlar\\n/website - Saytga o\'tish\\n/support - Qo\'llab-quvvatlash',
    ru: 'Команды:\\n/start - Главная страница\\n/account - Информация об аккаунте\\n/balance - Информация о балансе\\n/apikeys - API ключи\\n/deposit - Пополнить баланс\\n/usage - Статистика использования\\n/docs - Документация\\n/website - Перейти на сайт\\n/support - Поддержка',
    en: 'Commands:\\n/start - Home page\\n/account - Account information\\n/balance - Balance information\\n/apikeys - API keys\\n/deposit - Make a deposit\\n/usage - Usage statistics\\n/docs - Documentation\\n/website - Open website\\n/support - Support'
  },
  enter_code: {
    uz: '🔗 Hisobni ulash\\n\\nIltimos, 16 xonali ulash kodini yuboring.\\n\\nKodni hisob sozlamalaridan olishingiz mumkin.',
    ru: '🔗 Привязка аккаунта\\n\\nПожалуйста, отправьте 16-значный код привязки.\\n\\nКод можно получить в настройках аккаунта.',
    en: '🔗 Link Account\\n\\nPlease send the 16-digit linking code.\\n\\nYou can get the code from account settings.'
  },
  invalid_code: {
    uz: '❌ Noto\'g\'ri kod formati! 16 ta belgi kerak.',
    ru: '❌ Неверный формат кода! Нужно 16 символов.',
    en: '❌ Invalid code format! Need 16 characters.'
  },
  link_success: {
    uz: '\\n\\nEndi botdan to\'liq foydalanishingiz mumkin!',
    ru: '\\n\\nТеперь вы можете полноценно использовать бота!',
    en: '\\n\\nNow you can use the bot fully!'
  },
  link_error: {
    uz: '❌ Xatolik: ',
    ru: '❌ Ошибка: ',
    en: '❌ Error: '
  },
  already_linked: {
    uz: '✅ Siz allaqachon ulagansiz!\\n\\nEmail: ',
    ru: '✅ Вы уже привязаны!\\n\\nEmail: ',
    en: '✅ You are already linked!\\n\\nEmail: '
  },
  balance: {
    uz: 'Balans: ',
    ru: 'Баланс: ',
    en: 'Balance: '
  },
  enter_amount: {
    uz: '💰 Depozit Qilish\\n\\nIltimos, qancha token sotib olmoqchi ekanligingizni yozing.\\n\\nMisol: 10000\\n(Minimal 1000 token)',
    ru: '💰 Пополнить баланс\\n\\nПожалуйста, напишите, сколько токенов вы хотите купить.\\n\\nПример: 10000\\n(Минимум 1000 токенов)',
    en: '💰 Deposit\\n\\nPlease write how many tokens you want to buy.\\n\\nExample: 10000\\n(Minimum 1000 tokens)'
  },
  invalid_amount: {
    uz: '❌ Noto\'g\'ri summa! Minimum 1000 token.',
    ru: '❌ Неверная сумма! Минимум 1000 токенов.',
    en: '❌ Invalid amount! Minimum 1000 tokens.'
  },
  payment_info: {
    uz: '💰 To\'lov summasi: ',
    ru: '💰 Сумма платежа: ',
    en: '💰 Payment amount: '
  },
  tokens: {
    uz: ' tokens\\n\\nTo\'lovni quyidagi karta raqamiga bajaring:\\n\\n💳 Card: ',
    ru: ' tokens\\n\\nВыполните платеж на следующую карту:\\n\\n💳 Карта: ',
    en: ' tokens\\n\\nMake payment to the following card:\\n\\n💳 Card: '
  },
  card_holder: {
    uz: '\\n👤 Name: ',
    ru: '\\n👤 Имя: ',
    en: '\\n👤 Name: '
  },
  card_phone: {
    uz: '\\n📱 Phone: ',
    ru: '\\n📱 Телефон: ',
    en: '\\n📱 Phone: '
  },
  send_screenshot: {
    uz: '\\n\\nTo\'lovni amalga oshirgandan so\'ng, skrinshotni yuboring.',
    ru: '\\n\\nПосле совершения платежа, отправьте скриншот.',
    en: '\\n\\nAfter making the payment, send the screenshot.'
  },
  payment_request_created: {
    uz: '✅ To\'lov so\'rovi yaratildi!\\n\\n💰 Summa: ',
    ru: '✅ Запрос на платеж создан!\\n\\n💰 Сумма: ',
    en: '✅ Payment request created!\\n\\n💰 Amount: '
  },
  payment_id: {
    uz: '\\n🆔 ID: ',
    ru: '\\n🆔 ID: ',
    en: '\\n🆔 ID: '
  },
  payment_waiting: {
    uz: '\\n\\nHozircha adminlarga ko\'rsatiladi. To\'lov tasdiqlangandan so\'ng balansingizga o\'tkaziladi.',
    ru: '\\n\\nСейчас будет показано админам. После подтверждения платежа баланс будет пополнен.',
    en: '\\n\\nIt will be shown to admins now. After payment confirmation, your balance will be credited.'
  },
  no_api_keys: {
    uz: 'Sizda hali API kalitlar yo\'q.\\n\\nAPI kalit yaratish uchun quyidagi tugmani bosing:',
    ru: 'У вас пока нет API ключей.\\n\\nНажмите кнопку ниже, чтобы создать API ключ:',
    en: 'You don\'t have any API keys yet.\\n\\nClick the button below to create an API key:'
  },
  create_key: {
    uz: '➕ Yangi kalit yaratish',
    ru: '➕ Создать новый ключ',
    en: '➕ Create new key'
  },
  key_created: {
    uz: '✅ Yangi API kalit yaratildi!\\n\\n🔑 Kalit: `',
    ru: '✅ Новый API ключ создан!\\n\\n🔑 Ключ: `',
    en: '✅ New API key created!\\n\\n🔑 Key: `'
  },
  key_warning: {
    uz: '`\\n\\n⚠️ Bu kalitni bir marta ko\'rsatiladi!\\nIltimos, uni xavfsiz saqlang.',
    ru: '`\\n\\n⚠️ Этот ключ показывается только один раз!\\nПожалуйста, сохраните его в безопасности.',
    en: '`\\n\\n⚠️ This key is shown only once!\\nPlease save it securely.'
  },
  today: {
    uz: '📅 Bugun:\\n  So\'rovlar: ',
    ru: '📅 Сегодня:\\n  Запросы: ',
    en: '📅 Today:\\n  Requests: '
  },
  this_month: {
    uz: '📆 Oy ichida:\\n  So\'rovlar: ',
    ru: '📆 В этом месяце:\\n  Запросы: ',
    en: '📆 This month:\\n  Requests: '
  },
  tokens_label: {
    uz: '\\n  Tokenlar: ',
    ru: '\\n  Токены: ',
    en: '\\n  Tokens: '
  },
  cost: {
    uz: '\\n  Xarajat: ',
    ru: '\\n  Расход: ',
    en: '\\n  Cost: '
  },
  support_info: {
    uz: '🆘 Qo\'llab-quvvatlash\\n\\n📧 Email: ',
    ru: '🆘 Поддержка\\n\\n📧 Email: ',
    en: '🆘 Support\\n\\n📧 Email: '
  },
  support_telegram: {
    uz: '\\n💬 Telegram: ',
    ru: '\\n💬 Telegram: ',
    en: '\\n💬 Telegram: '
  },
  contact_us: {
    uz: '\\n\\nMuammolar bo\'lsa, biz bilan bog\'laning!',
    ru: '\\n\\nЕсли возникнут проблемы, свяжитесь с нами!',
    en: '\\n\\nIf you have any problems, contact us!'
  },
  open_website: {
    uz: '🌐 ThinkSync saytiga xush kelibsiz!',
    ru: '🌐 Добро пожаловать на сайт ThinkSync!',
    en: '🌐 Welcome to ThinkSync website!'
  },
  available_models: {
    uz: 'Mavjud modellar:\\n',
    ru: 'Доступные модели:\\n',
    en: 'Available models:\\n'
  },
  and_more: {
    uz: '\\n...va yana ',
    ru: '\\n...и еще ',
    en: '\\n...and '
  },
  more_models: {
    uz: ' ta model',
    ru: ' моделей',
    en: ' more models'
  },
  open_docs: {
    uz: '📖 To\'liq hujjatlar',
    ru: '📖 Полная документация',
    en: '📖 Full documentation'
  },
  open_models: {
    uz: '🤖 Modellar ro\'yxati',
    ru: '🤖 Список моделей',
    en: '🤖 Models list'
  }
};

function getText(key: string, lang: Language = 'uz'): string {
  if (!t[key]) return key;
  return t[key][lang] || t[key]['uz'] || key;
}

// =============================================================================
// MIDDLEWARE - User Check
// =============================================================================

interface UserSession {
  state?: string;
  amount?: number;
  data?: any;
  language?: Language;
}

const sessions = new Map<number, UserSession>();

async function getLinkedUser(ctx: Context): Promise<any | null> {
  if (!ctx.from) return null;
  const user = await getUserByTelegramId(ctx.from.id);
  if (user) {
    await updateLastSeen(ctx.from.id);
  }
  return user;
}

async function requireLinkedUser(ctx: Context): Promise<any | null> {
  const user = await getLinkedUser(ctx);
  if (!user) {
    const lang = sessions.get(ctx.from?.id || 0)?.language || 'uz';
    await ctx.reply(
      getText('not_linked', lang) + '\\n\\n' +
      getText('link_instructions', lang) + '\\n\\n' +
      getText('link_step1', lang) + '\\n' +
      getText('link_step2', lang) + '\\n' +
      getText('link_step3', lang)
    );
    return null;
  }
  return user;
}

function getLanguageFromContext(ctx: Context): Language {
  return (sessions.get(ctx.from?.id || 0)?.language as Language) || 'uz';
}

// =============================================================================
// MAIN MENU
// =============================================================================

function getMainMenuKeyboard(lang: Language = 'uz') {
  const keyboard = new Keyboard()
    .text('🏠 ' + (lang === 'uz' ? 'Account' : lang === 'ru' ? 'Аккаунт' : 'Account')).text('💳 ' + (lang === 'uz' ? 'Balance' : lang === 'ru' ? 'Баланс' : 'Balance'))
    .row()
    .text('🔑 ' + (lang === 'uz' ? 'API Keys' : lang === 'ru' ? 'API Ключи' : 'API Keys')).text('💰 ' + (lang === 'uz' ? 'Deposit' : lang === 'ru' ? 'Пополнить' : 'Deposit'))
    .row()
    .text('📊 ' + (lang === 'uz' ? 'Usage' : lang === 'ru' ? 'Статистика' : 'Usage')).text('📚 ' + (lang === 'uz' ? 'Docs' : lang === 'ru' ? 'Доки' : 'Docs'))
    .row()
    .text('🌐 ' + (lang === 'uz' ? 'Open Website' : lang === 'ru' ? 'Открыть сайт' : 'Open Website')).text('🆘 ' + (lang === 'uz' ? 'Support' : lang === 'ru' ? 'Поддержка' : 'Support'));
  return keyboard;
}

// =============================================================================
// START & HELP
// =============================================================================

bot.command('start', async (ctx) => {
  if (!ctx.from) return;

  const existingSession = sessions.get(ctx.from.id);
  const lang = existingSession?.language || 'uz';

  // Check if user is already linked
  const user = await getLinkedUser(ctx);

  if (user) {
    // User is already linked, show main menu
    await ctx.reply(
      getText('welcome', lang) + '\\n\\n' +
      `Email: ${user.email}\\n` +
      getText('main_menu', lang),
      { reply_markup: getMainMenuKeyboard(lang) }
    );
  } else {
    // Check if this is a returning user (has session but not linked)
    // Show language selection for new users
    if (!existingSession) {
      // Show language selection
      const keyboard = new InlineKeyboard()
        .text('🇺🇿 O\'zbekcha', 'lang_uz')
        .row()
        .text('🇷🇺 Русский', 'lang_ru')
        .row()
        .text('🇬🇧 English', 'lang_en');

      await ctx.reply(
        getText('select_language', lang),
        { reply_markup: keyboard }
      );
      return;
    }

    // Show onboarding with proper instructions
    const keyboard = new InlineKeyboard()
      .url(getText('website', lang), WEBSITE_URL);

    await ctx.reply(
      getText('welcome', lang) + '\\n\\n' +
      getText('link_instructions', lang) + '\\n\\n' +
      getText('link_step1', lang) + '\\n' +
      getText('link_step2', lang) + '\\n' +
      getText('link_step3', lang),
      { reply_markup: keyboard }
    );
  }
});

bot.callbackQuery('lang_uz', async (ctx) => {
  if (!ctx.from) return;
  const lang: Language = 'uz';
  sessions.set(ctx.from.id, { ...sessions.get(ctx.from.id), language: lang });
  await updateLanguage(ctx.from.id, lang);
  await ctx.answerCallbackQuery(getText('language_selected', lang));

  // Show onboarding
  const keyboard = new InlineKeyboard()
    .url(getText('website', lang), WEBSITE_URL);

  await ctx.editMessageText(
    getText('welcome', lang) + '\\n\\n' +
    getText('link_instructions', lang) + '\\n\\n' +
    getText('link_step1', lang) + '\\n' +
    getText('link_step2', lang) + '\\n' +
    getText('link_step3', lang),
    { reply_markup: keyboard }
  );
});

bot.callbackQuery('lang_ru', async (ctx) => {
  if (!ctx.from) return;
  const lang: Language = 'ru';
  sessions.set(ctx.from.id, { ...sessions.get(ctx.from.id), language: lang });
  await updateLanguage(ctx.from.id, lang);
  await ctx.answerCallbackQuery(getText('language_selected', lang));

  // Show onboarding
  const keyboard = new InlineKeyboard()
    .url(getText('website', lang), WEBSITE_URL);

  await ctx.editMessageText(
    getText('welcome', lang) + '\\n\\n' +
    getText('link_instructions', lang) + '\\n\\n' +
    getText('link_step1', lang) + '\\n' +
    getText('link_step2', lang) + '\\n' +
    getText('link_step3', lang),
    { reply_markup: keyboard }
  );
});

bot.callbackQuery('lang_en', async (ctx) => {
  if (!ctx.from) return;
  const lang: Language = 'en';
  sessions.set(ctx.from.id, { ...sessions.get(ctx.from.id), language: lang });
  await updateLanguage(ctx.from.id, lang);
  await ctx.answerCallbackQuery(getText('language_selected', lang));

  // Show onboarding
  const keyboard = new InlineKeyboard()
    .url(getText('website', lang), WEBSITE_URL);

  await ctx.editMessageText(
    getText('welcome', lang) + '\\n\\n' +
    getText('link_instructions', lang) + '\\n\\n' +
    getText('link_step1', lang) + '\\n' +
    getText('link_step2', lang) + '\\n' +
    getText('link_step3', lang),
    { reply_markup: keyboard }
  );
});

bot.command('help', async (ctx) => {
  const lang = getLanguageFromContext(ctx);
  await ctx.reply(
    getText('help', lang) + '\\n\\n' +
    getText('commands', lang)
  );
});

// =============================================================================
// LINK COMMAND
// =============================================================================

bot.command('link', async (ctx) => {
  if (!ctx.from) return;

  const lang = getLanguageFromContext(ctx);
  const user = await getLinkedUser(ctx);
  if (user) {
    await ctx.reply(
      getText('already_linked', lang) + user.email + '\\n' +
      getText('balance', lang) + user.balance
    );
    return;
  }

  // Ask for linking code
  sessions.set(ctx.from.id, { ...sessions.get(ctx.from.id), state: 'waiting_link_code' });
  await ctx.reply(getText('enter_code', lang));
});

// Handle text messages for linking
bot.on('message:text', async (ctx) => {
  if (!ctx.from) return;

  const session = sessions.get(ctx.from.id);
  if (!session) return;

  const lang = session.language || 'uz';

  if (session.state === 'waiting_link_code') {
    const code = ctx.message.text.trim().toUpperCase();

    if (code.length !== 16) {
      await ctx.reply(getText('invalid_code', lang));
      return;
    }

    const result = await linkTelegramAccount(code, ctx.from.id, ctx.from.username, lang);

    if (result.success) {
      sessions.delete(ctx.from.id);
      await ctx.reply(
        getText('account_linked', lang) + '\\n\\n' +
        `Email: ${result.user?.email}\\n` +
        getText('balance', lang) + result.user?.balance + '\\n' +
        getText('link_success', lang),
        { reply_markup: getMainMenuKeyboard(lang) }
      );
    } else {
      await ctx.reply(getText('link_error', lang) + result.error);
    }
  }

  else if (session.state === 'waiting_deposit_amount') {
    const amount = parseInt(ctx.message.text.trim());

    if (isNaN(amount) || amount < 1000) {
      await ctx.reply(getText('invalid_amount', lang));
      return;
    }

    // Get payment card info from platform settings
    const cardInfo = await getPaymentCardInfo();

    sessions.set(ctx.from.id, { ...session, state: 'waiting_screenshot', amount });

    await ctx.reply(
      getText('payment_info', lang) + amount +
      getText('tokens', lang) + cardInfo.number +
      getText('card_holder', lang) + cardInfo.holder +
      getText('card_phone', lang) + cardInfo.phone +
      getText('send_screenshot', lang)
    );
  }

  else if (session.state === 'waiting_screenshot_confirm') {
    const confirm = ctx.message.text.toLowerCase();

    if (confirm.includes('ha') || confirm === 'tugadi' || confirm === 'done' ||
        confirm.includes('да') || confirm === 'готово' ||
        confirm.includes('yes') || confirm === 'done') {
      sessions.delete(ctx.from.id);
      await ctx.reply(
        `📸 ${getText('send_screenshot', lang).trim()}`
      );
    } else {
      await ctx.reply('Iltimos, skrinshotni yuboring yoki "Bekor qilish" deb yozing. / Пожалуйста, отправьте скриншот или напишите "Отмена". / Please send the screenshot or write "Cancel".');
    }
  }
});

// =============================================================================
// ACCOUNT
// =============================================================================

bot.command('account', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;

  const lang = getLanguageFromContext(ctx);

  await ctx.reply(
    getText('account_info', lang) + '\\n\\n' +
    `📧 Email: ${user.email}\\n` +
    getText('balance', lang) + user.balance + ' tokens\\n' +
    `📊 Tier: ${user.plan_tier || 'free'}\\n` +
    `✅ Status: ${user.is_active ? (lang === 'uz' ? 'Faol' : lang === 'ru' ? 'Активен' : 'Active') : (lang === 'uz' ? 'Nofaol' : lang === 'ru' ? 'Неактивен' : 'Inactive')}\\n` +
    `📅 Ro'yxatdan o'tgan: ${new Date(user.created_at).toLocaleDateString()}`
  );
});

// =============================================================================
// BALANCE
// =============================================================================

bot.command('balance', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;

  const lang = getLanguageFromContext(ctx);
  const userId = user.id;
  const currentBalance = await getCurrentBalance(userId);
  const totalSpent = await getTotalSpentByUser(userId);

  const transactions = await listTransactionsForUser(userId, { limit: 5 });

  let message = getText('balance_info', lang) + '\\n\\n';
  message += getText('balance', lang) + currentBalance + ' tokens\\n';
  message += (lang === 'uz' ? '💳 Jami sarflangan: ' : lang === 'ru' ? '💳 Всего потрачено: ' : '💳 Total spent: ') + totalSpent + ' tokens\\n\\n';
  message += (lang === 'uz' ? 'Oxirgi tranzaksiyalar:\\n' : lang === 'ru' ? 'Последние транзакции:\\n' : 'Recent transactions:\\n');

  if (transactions.length === 0) {
    message += (lang === 'uz' ? 'Tranzaksiyalar yo\'q' : lang === 'ru' ? 'Транзакций нет' : 'No transactions');
  } else {
    for (const tx of transactions) {
      const sign = tx.amount > 0 ? '+' : '';
      message += `${sign}${tx.amount} - ${tx.transaction_type} (${new Date(tx.created_at).toLocaleDateString()})\\n`;
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

  const lang = getLanguageFromContext(ctx);
  const keys = await listApiKeysForUser(user.id);

  if (keys.length === 0) {
    const keyboard = new InlineKeyboard().text(getText('create_key', lang), 'create_apikey');

    await ctx.reply(
      getText('api_keys', lang) + '\\n\\n' +
      getText('no_api_keys', lang),
      { reply_markup: keyboard }
    );
    return;
  }

  let message = getText('api_keys', lang) + '\\n\\n';

  for (const key of keys) {
    message += `• ${key.name}\\n`;
    message += `  Key: ${key.key_prefix}...\\n`;
    message += `  Status: ${key.status}\\n`;
    message += `  Created: ${new Date(key.created_at).toLocaleDateString()}\\n\\n`;
  }

  const keyboard = new InlineKeyboard()
    .text(getText('create_key', lang), 'create_apikey');

  await ctx.reply(message, { reply_markup: keyboard });
});

bot.callbackQuery('create_apikey', async (ctx) => {
  const user = await getLinkedUser(ctx);
  if (!user) {
    await ctx.answerCallbackQuery('❌ Hisobingizni ulashing kerak! / ❌ Вы должны привязать аккаунт! / ❌ You must link your account!');
    return;
  }

  const lang = getLanguageFromContext(ctx);

  // Generate API key with proper parameters
  const keyPrefix = 'ts_' + randomUUID().replace(/-/g, '').substring(0, 8);
  const fullKey = keyPrefix + randomUUID().replace(/-/g, '');
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

  const newKey = await createApiKey({
    profile_id: user.id,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    name: 'Telegram Bot',
  });

  await ctx.editMessageText(
    getText('key_created', lang) + fullKey + getText('key_warning', lang),
    { parse_mode: 'Markdown' }
  );
});

// =============================================================================
// DEPOSIT
// =============================================================================

bot.command('deposit', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;

  const lang = getLanguageFromContext(ctx);
  sessions.set(ctx.from.id, { ...sessions.get(ctx.from.id), state: 'waiting_deposit_amount' });

  await ctx.reply(getText('enter_amount', lang));
});

// Handle "To'lov qildim" response
bot.command('payment_done', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;

  const lang = getLanguageFromContext(ctx);
  const session = sessions.get(ctx.from.id);

  if (session?.state === 'waiting_screenshot' || session?.amount) {
    await ctx.reply(
      `📸 ${getText('send_screenshot', lang).trim()}`
    );
  } else {
    await ctx.reply(
      (lang === 'uz' ? 'Iltimos avval /deposit buyrug\'ini bosing va summani kiriting.' :
       lang === 'ru' ? 'Пожалуйста, сначала нажмите /deposit и введите сумму.' :
       'Please first click /deposit and enter the amount.')
    );
  }
});

// Handle photo uploads for payment screenshots
bot.on('message:photo', async (ctx) => {
  const user = await getLinkedUser(ctx);
  if (!user) return;

  const lang = getLanguageFromContext(ctx);
  const session = sessions.get(ctx.from?.id || 0);

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

    sessions.delete(ctx.from?.id || 0);

    await ctx.reply(
      getText('payment_request_created', lang) + session.amount +
      getText('payment_id', lang) + payment.id.slice(0, 8) +
      getText('payment_waiting', lang)
    );
  }
});

// =============================================================================
// USAGE
// =============================================================================

bot.command('usage', async (ctx) => {
  const user = await requireLinkedUser(ctx);
  if (!user) return;

  const lang = getLanguageFromContext(ctx);

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
    getText('usage', lang) + '\\n\\n' +
    getText('today', lang) + todayData.requests +
    getText('tokens_label', lang) + todayData.tokens +
    getText('cost', lang) + todayData.cost + ' tokens\\n\\n' +
    getText('this_month', lang) + monthData.requests +
    getText('tokens_label', lang) + monthData.tokens +
    getText('cost', lang) + monthData.cost + ' tokens'
  );
});

// =============================================================================
// DOCUMENTATION
// =============================================================================

bot.command('docs', async (ctx) => {
  const lang = getLanguageFromContext(ctx);
  const models = await listModels({ status: 'active' });

  let message = getText('docs', lang) + '\\n\\n';
  message += `🌐 API: ${THINKSYNC_API_URL}\\n`;
  message += `📖 ${getText('docs', lang)}: ${WEBSITE_URL}/docs\\n`;
  message += `🤖 ${getText('available_models', lang)}: ${WEBSITE_URL}/models\\n\\n`;
  message += getText('available_models', lang);

  for (const model of models.slice(0, 5)) {
    message += `• ${model.display_name} (${model.slug})\\n`;
  }

  if (models.length > 5) {
    message += getText('and_more', lang) + (models.length - 5) + getText('more_models', lang);
  }

  const keyboard = new InlineKeyboard()
    .text(getText('open_docs', lang), 'open_docs')
    .text(getText('open_models', lang), 'open_models');

  await ctx.reply(message, { reply_markup: keyboard });
});

bot.callbackQuery('open_docs', async (ctx) => {
  const lang = getLanguageFromContext(ctx);
  const keyboard = new InlineKeyboard()
    .url(getText('open_docs', lang), `${WEBSITE_URL}/docs`);
  await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('open_models', async (ctx) => {
  const lang = getLanguageFromContext(ctx);
  const keyboard = new InlineKeyboard()
    .url(getText('open_models', lang), `${WEBSITE_URL}/models`);
  await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  await ctx.answerCallbackQuery();
});

// =============================================================================
// WEBSITE
// =============================================================================

bot.command('website', async (ctx) => {
  const lang = getLanguageFromContext(ctx);
  const keyboard = new InlineKeyboard()
    .url(getText('website', lang), WEBSITE_URL);

  await ctx.reply(
    getText('open_website', lang),
    { reply_markup: keyboard }
  );
});

// =============================================================================
// SUPPORT
// =============================================================================

bot.command('support', async (ctx) => {
  const lang = getLanguageFromContext(ctx);
  const supportInfo = await getSupportInfo();

  await ctx.reply(
    getText('support_info', lang) + supportInfo.email +
    getText('support_telegram', lang) + supportInfo.telegram +
    getText('contact_us', lang)
  );
});

// =============================================================================
// KEYBOARD BUTTON HANDLERS
// =============================================================================

bot.hears(/🏠.*Account|Аккаунт|Account/, async (ctx) => {
  ctx.message.text = '/account';
  await bot.handleUpdate(ctx.update);
});

bot.hears(/💳.*Balance|Баланс|Balance/, async (ctx) => {
  ctx.message.text = '/balance';
  await bot.handleUpdate(ctx.update);
});

bot.hears(/🔑.*API Keys|API Ключи|API Keys/, async (ctx) => {
  ctx.message.text = '/apikeys';
  await bot.handleUpdate(ctx.update);
});

bot.hears(/💰.*Deposit|Пополнить|Deposit/, async (ctx) => {
  ctx.message.text = '/deposit';
  await bot.handleUpdate(ctx.update);
});

bot.hears(/📊.*Usage|Статистика|Usage/, async (ctx) => {
  ctx.message.text = '/usage';
  await bot.handleUpdate(ctx.update);
});

bot.hears(/📚.*Docs|Доки|Docs/, async (ctx) => {
  ctx.message.text = '/docs';
  await bot.handleUpdate(ctx.update);
});

bot.hears(/🌐.*Website|Открыть сайт|Open Website/, async (ctx) => {
  ctx.message.text = '/website';
  await bot.handleUpdate(ctx.update);
});

bot.hears(/🆘.*Support|Поддержка|Support/, async (ctx) => {
  ctx.message.text = '/support';
  await bot.handleUpdate(ctx.update);
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
bot.start({
  onStart: () => {
    console.log(`[USER-BOT] Bot started in ${process.env.NODE_ENV || "development"} mode`);
  },
  drop_pending_updates: true,
});

export default bot;
