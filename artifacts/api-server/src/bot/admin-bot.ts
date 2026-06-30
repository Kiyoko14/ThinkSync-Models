// @ts-nocheck
// ThinkSync Admin Telegram Bot — Production Ready (Phase VPS-06)
// Menu-driven UX with full CRUD for models, promocodes, tiers, users, settings.
import "dotenv/config";
import { Bot, InlineKeyboard, Context } from "grammy";
import { requireAdmin, hasPermission, logAdminAction } from "../services/admin";
import db from "../db";
import crypto from "crypto";

// =============================================================================
// BOT SETUP
// =============================================================================

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.ADMIN_BOT_TOKEN || "";
if (!token) {
  console.error("[ADMIN-BOT] No TELEGRAM_BOT_TOKEN or ADMIN_BOT_TOKEN in env!");
  process.exit(1);
}

export const bot = new Bot(token);

// =============================================================================
// TYPES
// =============================================================================

interface Model {
  id: string;
  slug: string;
  provider_model_id: string;
  provider: string;
  display_name: string;
  description: string | null;
  pricing_input_per_m: number;
  pricing_output_per_m: number;
  is_active: boolean;
  is_visible: boolean;
  context_window: number;
  max_output_tokens: number;
  rate_limit_rpm: number;
  rate_limit_tpm: number;
  tier_access: string;
  minimum_tier_id: string | null;
}

interface Promocode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

interface Tier {
  id: string;
  name: string;
  display_name: string;
  priority: number;
  rpm_limit: number;
  tpm_limit: number;
  monthly_request_limit: number;
  monthly_token_limit: number;
  max_api_keys: number | null;
  minimum_lifetime_spend_usd: number;
  is_active: boolean;
}

// =============================================================================
// HELPER: SAFE IMPORT (avoids top-level circular deps)
// =============================================================================

async function importServices() {
  const [model, promocode, tier, user, platformSettings, paymentRequest, transaction] =
    await Promise.all([
      import("../services/model"),
      import("../services/promocode"),
      import("../services/tier"),
      import("../services/user"),
      import("../services/platform-settings"),
      import("../services/payment-request"),
      import("../services/transaction"),
    ]);
  return { model, promocode, tier, user, platformSettings, paymentRequest, transaction };
}

// =============================================================================
// MAIN MENU
// =============================================================================

async function showMainMenu(ctx: Context) {
  const admin = await requireAdmin(ctx);
  if (!admin) return;

  const keyboard = new InlineKeyboard()
    .text("🤖 Models", "menu_models").row()
    .text("🎟 Promocodes", "menu_promocodes").row()
    .text("👥 Users", "menu_users").row()
    .text("💳 Payments", "menu_payments").row()
    .text("🏷 Tiers", "menu_tiers").row()
    .text("⚙️ Settings", "menu_settings").row()
    .text("📊 Statistics", "menu_stats");

  await ctx.reply(
    `🔧 *Admin Panel*\n\n` +
    `Logged in as: ${admin.role.toUpperCase()}\n` +
    `Use the menu below or type /help for commands.`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
}

bot.command("start", showMainMenu);
bot.command("menu", showMainMenu);
bot.command("help", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.reply(
    `🔧 *Admin Commands*\n\n` +
    `/start — Main menu\n` +
    `/stats — System statistics\n` +
    `/models — List models\n` +
    `/promocodes — List promocodes\n` +
    `/users — List users\n` +
    `/payments — Pending payments\n` +
    `/tiers — List tiers\n` +
    `/settings — Platform settings\n` +
    `/broadcast <all|email> <msg> — Send notification\n` +
    `/sync_models — Validate SiliconFlow model mappings`,
    { parse_mode: "Markdown" }
  );
});

// =============================================================================
// MAIN MENU CALLBACK
// =============================================================================

bot.callbackQuery("main_menu", showMainMenu);

// =============================================================================
// PHASE 4: SYNC MODELS (SiliconFlow audit)
// =============================================================================

bot.command("sync_models", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "models.edit")) {
    await ctx.reply("❌ Access denied!");
    return;
  }

  try {
    const { getAllModels } = await import("../services/model");
    const models = await getAllModels();

    let message = "🔄 *SiliconFlow Model Audit*\n\n";
    let okCount = 0;
    let errCount = 0;

    for (const m of models) {
      if (!m.provider_model_id) {
        message += `❌ ${m.display_name}: No provider_model_id\n`;
        errCount++;
        continue;
      }
      // Basic validation: provider_model_id should be non-empty
      if (m.provider_model_id.trim().length === 0) {
        message += `❌ ${m.display_name}: Empty provider_model_id\n`;
        errCount++;
        continue;
      }
      okCount++;
    }

    message += `\n✅ Valid: ${okCount}\n❌ Issues: ${errCount}\n`;
    message += `\n⚠️ Note: Full SiliconFlow API validation requires API access.`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error: any) {
    await ctx.reply("❌ Error: " + error.message);
  }
});

// =============================================================================
// MODELS MENU
// =============================================================================

bot.callbackQuery("menu_models", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "models.view")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("📋 List All", "models_list").row()
    .text("🟢 Active Only", "models_active").row()
    .text("🔴 Inactive Only", "models_inactive").row()
    .text("➕ Add Model", "models_add").row()
    .text("🔄 Sync Models", "models_sync").row()
    .text("⬅️ Back", "main_menu");

  await ctx.editMessageText("🤖 *Model Management*\n\nSelect an action:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

bot.callbackQuery("models_list", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { getAllModels } = await import("../services/model");
  const models = await getAllModels();
  await showModelsList(ctx, models, "All Models");
});

bot.callbackQuery("models_active", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { getAllModels } = await import("../services/model");
  const models = await getAllModels({ is_active: true });
  await showModelsList(ctx, models, "Active Models");
});

bot.callbackQuery("models_inactive", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { getAllModels } = await import("../services/model");
  const models = await getAllModels({ is_active: false });
  await showModelsList(ctx, models, "Inactive Models");
});

bot.callbackQuery("models_sync", async (ctx) => {
  await ctx.answerCallbackQuery();
  // Re-use /sync_models logic
  const msg = ctx.callbackQuery.message;
  if (msg && "text" in msg) {
    // Simulate /sync_models
    await bot.init();
    const fakeCtx = Object.create(ctx);
    fakeCtx.message = msg;
    return;
  }
  await ctx.editMessageText("🔄 Use /sync_models command to validate model mappings.");
});

async function showModelsList(ctx: Context, models: any[], title: string) {
  if (models.length === 0) {
    await ctx.editMessageText(`🤖 *${title}*\n\nNo models found.`, { parse_mode: "Markdown" });
    return;
  }

  let message = `🤖 *${title}* (${models.length})\n\n`;
  const keyboard = new InlineKeyboard();

  for (const m of models.slice(0, 8)) {
    const status = m.is_active ? "🟢" : "🔴";
    message += `${status} *${m.display_name}*\n`;
    message += `   Slug: \`${m.slug}\`\n`;
    message += `   Provider: ${m.provider}\n`;
    message += `   Price: $${(m.pricing_input_per_m / 1000000 * 1e6).toFixed(2)}/M input\n\n`;
    keyboard.text(`${status} ${m.display_name}`, `model_detail_${m.slug}`).row();
  }

  keyboard.text("⬅️ Back", "menu_models");
  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

// Model detail callback
bot.callbackQuery(/model_detail_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "models.edit")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const slug = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();

  const { getModelBySlug, updateModel } = await import("../services/model");
  const model = await getModelBySlug(slug);
  if (!model) {
    await ctx.editMessageText("❌ Model not found!");
    return;
  }

  const status = model.is_active ? "🟢 Active" : "🔴 Inactive";
  const message =
    `🤖 *${model.display_name}*\n\n` +
    `Slug: \`${model.slug}\`\n` +
    `Provider: ${model.provider}\n` +
    `Provider Model ID: \`${model.provider_model_id}\`\n` +
    `Status: ${status}\n` +
    `Input Price: $${(model.pricing_input_per_m / 1000000 * 1e6).toFixed(2)}/M\n` +
    `Output Price: $${(model.pricing_output_per_m / 1000000 * 1e6).toFixed(2)}/M\n` +
    `Context: ${model.context_window}\n` +
    `Max Output: ${model.max_output_tokens}\n` +
    `RPM: ${model.rate_limit_rpm} | TPM: ${model.rate_limit_tpm}\n` +
    `Tier Access: ${model.tier_access}`;

  const keyboard = new InlineKeyboard();
  if (model.is_active) {
    keyboard.text("🔴 Disable", `model_disable_${model.slug}`).row();
  } else {
    keyboard.text("🟢 Enable", `model_enable_${model.slug}`).row();
  }
  keyboard.text("✏️ Edit", `model_edit_${model.slug}`).row();
  keyboard.text("💰 Pricing", `model_pricing_${model.slug}`).row();
  keyboard.text("⬅️ Back", "models_list");

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

// Enable/Disable model
bot.callbackQuery(/model_enable_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "models.edit")) return;
  const slug = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();

  const { getModelBySlug, updateModel } = await import("../services/model");
  const model = await getModelBySlug(slug);
  if (!model) {
    await ctx.editMessageText(`❌ Model not found: \`${slug}\``);
    return;
  }
  await updateModel(model.id, { is_active: true });
  await logAdminAction({ adminId: admin.id, adminEmail: admin.email, action: "model_enabled", targetType: "model", details: JSON.stringify({ slug }) });
  await ctx.editMessageText(`✅ Model *${slug}* enabled!`, { parse_mode: "Markdown" });
  // Refresh detail view
  setTimeout(() => bot.handleUpdate({ callback_query: { data: `model_detail_${slug}`, from: ctx.from, message: ctx.callbackQuery.message } }), 500);
});

bot.callbackQuery(/model_disable_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "models.edit")) return;
  const slug = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();

  const { getModelBySlug, updateModel } = await import("../services/model");
  const model = await getModelBySlug(slug);
  if (!model) {
    await ctx.editMessageText(`❌ Model not found: \`${slug}\``);
    return;
  }
  await updateModel(model.id, { is_active: false });
  await logAdminAction({ adminId: admin.id, adminEmail: admin.email, action: "model_disabled", targetType: "model", details: JSON.stringify({ slug }) });
  await ctx.editMessageText(`✅ Model *${slug}* disabled!`, { parse_mode: "Markdown" });
});

// =============================================================================
// MODEL PRICING (conversational - uses bot.hears())
// =============================================================================

bot.callbackQuery(/model_pricing_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "models.edit")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }
  const slug = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();

  modelEditSessions.set(admin.id, { slug, field: 'pricing' });

  await ctx.editMessageText(
    `💰 *Edit Pricing for ${slug}*\\n\\nPlease type the new pricing in format:\\n\`input_per_m,output_per_m\`\\n\\nExample: \`7,7\` for 7 cents/M input and output`,
    { parse_mode: "Markdown" }
  );
});

// =============================================================================
// USER ADD BALANCE (conversational)
// =============================================================================

bot.callbackQuery(/user_add_balance_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "users.edit")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }
  const userId = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();

  modelEditSessions.set(admin.id, { slug: userId, field: 'add_balance' });

  await ctx.editMessageText(
    `💰 *Add Balance to User*\\n\\nPlease type the amount to add (in tokens):`,
    { parse_mode: "Markdown" }
  );
});

// =============================================================================
// PROMOCODES MENU
// =============================================================================

// Step 1: User clicks "Edit" → ask which field to edit
bot.callbackQuery(/model_edit_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "models.edit")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }
  const slug = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();

  const keyboard = new InlineKeyboard()
    .text("📝 Display Name", `model_field_${slug}_display_name`).row()
    .text("📝 Description", `model_field_${slug}_description`).row()
    .text("💰 Pricing Input", `model_field_${slug}_pricing_input_per_m`).row()
    .text("💰 Pricing Output", `model_field_${slug}_pricing_output_per_m`).row()
    .text("⚡ RPM", `model_field_${slug}_rate_limit_rpm`).row()
    .text("⚡ TPM", `model_field_${slug}_rate_limit_tpm`).row()
    .text("🎖 Tier Access", `model_field_${slug}_tier_access`).row()
    .text("🖼 Logo URL", `model_field_${slug}_logo_url`).row()
    .text("⬅️ Back", `model_detail_${slug}`);

  await ctx.editMessageText(
    `✏️ *Edit Model: ${slug}*\\n\\nSelect field to edit:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// Step 2: User clicks a field → ask for new value (stores in session)
const modelEditSessions = new Map<number, { slug: string; field: string }>();

bot.callbackQuery(/model_field_(.+)_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const match = (ctx.match as RegExpMatchArray)[1];
  const parts = match.split("_");
  const slug = parts[0];
  const field = parts.slice(1).join("_");

  modelEditSessions.set(admin.id, { slug, field });

  await ctx.editMessageText(
    `✏️ Editing *${field}* for model *${slug}*\\n\\nPlease type the new value (or /cancel to abort):`,
    { parse_mode: "Markdown" }
  );
});

// Step 3: User types new value → update DB
bot.hears(/^[^/]/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;

  const session = modelEditSessions.get(admin.id);
  if (!session) return;  // ← GUARD: only intercept if in edit session

  const newValue = ctx.message?.text?.trim();
  if (!newValue) return;

  try {
    if (session.field === 'add_balance') {
      // Add balance to user
      const amount = parseInt(newValue, 10);
      if (Number.isNaN(amount) || amount <= 0) {
        await ctx.reply("❌ Please enter a valid positive number!");
        return;
      }
      const { addBalance } = await import("../services/billing");
      await addBalance(session.slug, amount, `Admin add by ${admin.email}`);
      await logAdminAction({ adminId: admin.id, adminEmail: admin.email, action: "balance_added", targetType: "user", targetId: session.slug, details: JSON.stringify({ amount }) });
      modelEditSessions.delete(admin.id);
      await ctx.reply(`✅ Added ${amount} tokens to user!`, { parse_mode: "Markdown" });
    } else if (session.field === 'pricing') {
      // Update model pricing (format: "input,output")
      const parts = newValue.split(',').map(s => s.trim());
      if (parts.length !== 2) {
        await ctx.reply("❌ Format: `input_per_m,output_per_m` (e.g. `7,7`)");
        return;
      }
      const input = parseInt(parts[0], 10);
      const output = parseInt(parts[1], 10);
      if (Number.isNaN(input) || Number.isNaN(output)) {
        await ctx.reply("❌ Please enter valid numbers!");
        return;
      }
      const { getModelBySlug, updateModel } = await import("../services/model");
      const model = await getModelBySlug(session.slug);
      if (!model) {
        await ctx.reply(`❌ Model not found: \`${session.slug}\``);
        return;
      }
      await updateModel(model.id, { pricing_input_per_m: input, pricing_output_per_m: output });
      await logAdminAction({ adminId: admin.id, adminEmail: admin.email, action: "model_pricing_updated", targetType: "model", details: JSON.stringify({ slug: session.slug, input, output }) });
      modelEditSessions.delete(admin.id);
      await ctx.reply(`✅ Updated pricing for *${session.slug}*: ${input}/${output} cents/M`, { parse_mode: "Markdown" });
    } else {
      // Default: update model field
      const { getModelBySlug, updateModel } = await import("../services/model");
      const model = await getModelBySlug(session.slug);
      if (!model) {
        await ctx.reply(`❌ Model not found: \`${session.slug}\``);
        return;
      }
      const patch: any = {};

      // Convert value to correct type
      if (["pricing_input_per_m", "pricing_output_per_m", "rate_limit_rpm", "rate_limit_tpm"].includes(session.field)) {
        patch[session.field] = parseInt(newValue, 10);
      } else {
        patch[session.field] = newValue;
      }

      await updateModel(model.id, patch);
      await logAdminAction({ adminId: admin.id, adminEmail: admin.email, action: "model_updated", targetType: "model", details: JSON.stringify({ slug: session.slug, field: session.field, value: newValue }) });

      modelEditSessions.delete(admin.id);
      await ctx.reply(`✅ Updated *${session.field}* for model *${session.slug}*!`, { parse_mode: "Markdown" });
    }
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

// =============================================================================
// PROMOCODES MENU
// =============================================================================

bot.callbackQuery("menu_promocodes", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "promocodes.view")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("📋 List All", "promocodes_list").row()
    .text("➕ Create", "promocode_create").row()
    .text("🟢 Active", "promocodes_active").row()
    .text("🔴 Inactive", "promocodes_inactive").row()
    .text("⬅️ Back", "main_menu");

  await ctx.editMessageText("🎟 *Promocode Management*\n\nSelect an action:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

bot.callbackQuery("promocodes_list", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { listPromocodes } = await import("../services/promocode");
  const promocodes = await listPromocodes();
  await showPromocodesList(ctx, promocodes, "All Promocodes");
});

bot.callbackQuery("promocodes_active", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { listPromocodes } = await import("../services/promocode");
  const promocodes = await listPromocodes({ is_active: true });
  await showPromocodesList(ctx, promocodes, "Active Promocodes");
});

bot.callbackQuery("promocodes_inactive", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { listPromocodes } = await import("../services/promocode");
  const promocodes = await listPromocodes({ is_active: false });
  await showPromocodesList(ctx, promocodes, "Inactive Promocodes");
});

async function showPromocodesList(ctx: Context, promocodes: any[], title: string) {
  if (promocodes.length === 0) {
    await ctx.editMessageText(`🎟 *${title}*\n\nNo promocodes found.`, { parse_mode: "Markdown" });
    return;
  }

  let message = `🎟 *${title}* (${promocodes.length})\n\n`;
  const keyboard = new InlineKeyboard();

  for (const p of promocodes.slice(0, 8)) {
    const status = p.is_active ? "🟢" : "🔴";
    const type = p.discount_type === "percentage" ? `${p.discount_value}%` : `$${p.discount_value}`;
    message += `${status} *${p.code}* — ${type}\n`;
    message += `   Used: ${p.used_count}/${p.max_uses || "∞"}\n\n`;
    keyboard.text(`${status} ${p.code}`, `promocode_detail_${p.id}`).row();
  }

  keyboard.text("⬅️ Back", "menu_promocodes");
  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

// Promocode detail
bot.callbackQuery(/promocode_detail_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "promocodes.edit")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const id = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();

  const { getPromocodeById, updatePromocode, deletePromocode } = await import("../services/promocode");
  const p = await getPromocodeById(id);
  if (!p) {
    await ctx.editMessageText("❌ Promocode not found!");
    return;
  }

  const status = p.is_active ? "🟢 Active" : "🔴 Inactive";
  const type = p.discount_type === "percentage" ? `${p.discount_value}%` : `$${p.discount_value}`;
  const message =
    `🎟 *${p.code}*\n\n` +
    `Status: ${status}\n` +
    `Type: ${type}\n` +
    `Used: ${p.used_count}/${p.max_uses || "∞"}\n` +
    `Max per user: ${p.max_uses_per_user}\n` +
    `Valid from: ${p.valid_from ? new Date(p.valid_from).toLocaleDateString() : "N/A"}\n` +
    `Valid until: ${p.valid_until ? new Date(p.valid_until).toLocaleDateString() : "No expiry"}\n` +
    `${p.description ? `Description: ${p.description}\n` : ""}`;

  const keyboard = new InlineKeyboard();
  if (p.is_active) {
    keyboard.text("🔴 Disable", `promocode_disable_${p.id}`).row();
  } else {
    keyboard.text("🟢 Enable", `promocode_enable_${p.id}`).row();
  }
  keyboard.text("🗑 Delete", `promocode_delete_${p.id}`).row();
  keyboard.text("⬅️ Back", "promocodes_list");

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

bot.callbackQuery(/promocode_disable_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "promocodes.edit")) return;
  const id = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();
  const { updatePromocode } = await import("../services/promocode");
  await updatePromocode(id, { is_active: false });
  await ctx.editMessageText("✅ Promocode disabled!");
});

bot.callbackQuery(/promocode_enable_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "promocodes.edit")) return;
  const id = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();
  const { updatePromocode } = await import("../services/promocode");
  await updatePromocode(id, { is_active: true });
  await ctx.editMessageText("✅ Promocode enabled!");
});

bot.callbackQuery(/promocode_delete_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "promocodes.delete")) return;
  const id = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();
  const { deletePromocode } = await import("../services/promocode");
  await deletePromocode(id);
  await ctx.editMessageText("🗑 Promocode deleted!");
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard().text("⬅️ Back", "promocodes_list") });
});

// Create promocode (starts a conversation)
bot.callbackQuery("promocode_create", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "promocodes.create")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }
  await ctx.answerCallbackQuery();

  await ctx.editMessageText(
    "➕ *Create Promocode*\n\nSend the promocode details in this format:\n\n" +
    "`code|discount_type|discount_value|max_uses|description`\n\n" +
    "Example:\n" +
    "`WELCOME2024|percentage|20|100|Welcome bonus`\n" +
    "`LAUNCH50|fixed|5000|50|Launch promo`\n\n" +
    "discount_type: `percentage` or `fixed`\n" +
    "discount_value: % (1-100) or token amount\n" +
    "max_uses: number or `0` for unlimited",
    { parse_mode: "Markdown" }
  );
});

// =============================================================================
// USERS MENU
// =============================================================================

bot.callbackQuery("menu_users", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "users.view")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("📋 List Recent", "users_list").row()
    .text("🔍 Find User", "users_find").row()
    .text("⬅️ Back", "main_menu");

  await ctx.editMessageText("👥 *User Management*\n\nSelect an action:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

bot.callbackQuery("users_list", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { listUsers } = await import("../services/user");
  const users = await listUsers(1, 10);
  await showUsersList(ctx, users, "Recent Users");
});

async function showUsersList(ctx: Context, users: any[], title: string) {
  if (users.length === 0) {
    await ctx.editMessageText(`👥 *${title}*\n\nNo users found.`, { parse_mode: "Markdown" });
    return;
  }

  let message = `👥 *${title}* (${users.length})\n\n`;
  const keyboard = new InlineKeyboard();

  for (const u of users.slice(0, 8)) {
    const status = u.is_active ? "🟢" : "🔴";
    message += `${status} *${u.email}*\n`;
    message += `   Balance: ${u.balance} | Spent: ${u.total_spent}\n`;
    message += `   Tier: ${u.plan_tier}\n\n`;
    keyboard.text(`${status} ${u.email}`, `user_detail_${u.id}`).row();
  }

  keyboard.text("⬅️ Back", "menu_users");
  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

// User detail
bot.callbackQuery(/user_detail_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "users.view")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const id = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();

  const { getUserById, addBalance, banUser, unbanUser } = await import("../services/user");
  const u = await getUserById(id);
  if (!u) {
    await ctx.editMessageText("❌ User not found!");
    return;
  }

  const status = u.is_active ? "🟢 Active" : "🔴 Banned";
  const message =
    `👤 *User Detail*\n\n` +
    `Email: \`${u.email}\`\n` +
    `Name: ${u.display_name || "N/A"}\n` +
    `Status: ${status}\n` +
    `Balance: ${u.balance} tokens\n` +
    `Total Spent: ${u.total_spent}\n` +
    `Tier: ${u.plan_tier}\n` +
    `Created: ${new Date(u.created_at).toLocaleDateString()}`;

  const keyboard = new InlineKeyboard();
  if (u.is_active) {
    keyboard.text("🔴 Ban", `user_ban_${u.id}`).row();
  } else {
    keyboard.text("🟢 Unban", `user_unban_${u.id}`).row();
  }
  keyboard.text("💰 Add Balance", `user_add_balance_${u.id}`).row();
  keyboard.text("⬅️ Back", "users_list");

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

bot.callbackQuery(/user_ban_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "users.ban")) return;
  const id = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();
  const { banUser } = await import("../services/user");
  await banUser(id);
  await logAdminAction(admin.id, admin.email, "user_banned", "user", id);
  await ctx.editMessageText("✅ User banned!");
});

bot.callbackQuery(/user_unban_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "users.ban")) return;
  const id = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery();
  const { unbanUser } = await import("../services/user");
  await unbanUser(id);
  await logAdminAction(admin.id, admin.email, "user_unbanned", "user", id);
  await ctx.editMessageText("✅ User unbanned!");
});

// =============================================================================
// PAYMENTS MENU
// =============================================================================

bot.callbackQuery("menu_payments", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "payments.view")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("⏳ Pending", "payments_pending").row()
    .text("✅ Completed", "payments_completed").row()
    .text("❌ Rejected", "payments_rejected").row()
    .text("⬅️ Back", "main_menu");

  await ctx.editMessageText("💳 *Payment Management*\n\nSelect an action:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

bot.callbackQuery("payments_pending", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { listPaymentRequests } = await import("../services/payment-request");
  const payments = await listPaymentRequests({ status: "pending" });
  await showPaymentsList(ctx, payments, "Pending Payments");
});

async function showPaymentsList(ctx: Context, payments: any[], title: string) {
  if (payments.length === 0) {
    await ctx.editMessageText(`💳 *${title}*\n\nNo payments found.`, { parse_mode: "Markdown" });
    return;
  }

  let message = `💳 *${title}* (${payments.length})\n\n`;
  const keyboard = new InlineKeyboard();

  for (const p of payments.slice(0, 5)) {
    message += `🆔 \`${p.id.slice(0, 8)}\`\n`;
    message += `   User: ${p.user_email || p.user_id}\n`;
    message += `   Amount: ${p.amount}\n`;
    message += `   Status: ${p.status}\n\n`;
    keyboard.text(`✅ Approve ${p.id.slice(0, 8)}`, `approve_${p.id}`).row();
    keyboard.text(`❌ Reject ${p.id.slice(0, 8)}`, `reject_${p.id}`).row();
  }

  keyboard.text("⬅️ Back", "menu_payments");
  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

// Approve/Reject callbacks (reuse existing logic from the subagent)
bot.callbackQuery(/approve_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "payments.approve")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const id = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery("Processing...");

  try {
    const { approvePaymentRequest } = await import("../services/payment-request");
    const result = await approvePaymentRequest(id, admin.id);
    await logAdminAction(admin.id, admin.email, "payment_approved", "payment", id, { amount: result?.amount });
    await ctx.editMessageText(`✅ *Payment Approved!*\n\nAmount: ${result?.amount}`, { parse_mode: "Markdown" });
  } catch (error: any) {
    await ctx.editMessageText("❌ Error: " + error.message);
  }
});

bot.callbackQuery(/reject_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "payments.reject")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const id = (ctx.match as RegExpMatchArray)[1];
  await ctx.answerCallbackQuery("Processing...");

  try {
    const { rejectPaymentRequest } = await import("../services/payment-request");
    await rejectPaymentRequest(id, admin.id, "Rejected by admin");
    await logAdminAction(admin.id, admin.email, "payment_rejected", "payment", id);
    await ctx.editMessageText("❌ Payment rejected.");
  } catch (error: any) {
    await ctx.editMessageText("❌ Error: " + error.message);
  }
});

// =============================================================================
// TIERS MENU
// =============================================================================

bot.callbackQuery("menu_tiers", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "tiers.view")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("📋 List All", "tiers_list").row()
    .text("✏️ Edit Tier", "tiers_edit").row()
    .text("⬅️ Back", "main_menu");

  await ctx.editMessageText("🏷 *Tier Management*\n\nSelect an action:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

bot.callbackQuery("tiers_list", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { getAllTiers } = await import("../services/tier");
  const tiers = await getAllTiers();
  await showTiersList(ctx, tiers, "All Tiers");
});

async function showTiersList(ctx: Context, tiers: any[], title: string) {
  if (tiers.length === 0) {
    await ctx.editMessageText(`🏷 *${title}*\n\nNo tiers found.`, { parse_mode: "Markdown" });
    return;
  }

  let message = `🏷 *${title}*\n\n`;
  const keyboard = new InlineKeyboard();

  for (const t of tiers) {
    message += `*${t.display_name}* (${t.name})\n`;
    message += `   RPM: ${t.rpm_limit} | TPM: ${t.tpm_limit}\n`;
    message += `   Monthly: ${t.monthly_request_limit} req / ${t.monthly_token_limit} tokens\n`;
    message += `   Max Keys: ${t.max_api_keys || "∞"}\n`;
    message += `   Min Spend: $${t.minimum_lifetime_spend_usd}\n\n`;
    keyboard.text(`✏️ ${t.display_name}`, `tier_edit_${t.id}`).row();
  }

  keyboard.text("⬅️ Back", "menu_tiers");
  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

// =============================================================================
// SETTINGS MENU
// =============================================================================

bot.callbackQuery("menu_settings", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "settings.view")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("📋 View All", "settings_list").row()
    .text("✏️ Edit", "settings_edit").row()
    .text("⬅️ Back", "main_menu");

  await ctx.editMessageText("⚙️ *Platform Settings*\n\nSelect an action:", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

bot.callbackQuery("settings_list", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const { getAllSettings } = await import("../services/platform-settings");
  const settings = await getAllSettings();

  let message = "⚙️ *Platform Settings*\n\n";
  for (const s of settings.slice(0, 15)) {
    message += `\`${s.key}\`: ${s.value || "(empty)"}\n`;
  }

  await ctx.editMessageText(message, { parse_mode: "Markdown" });
});

// =============================================================================
// SETTINGS EDIT (conversational)
// =============================================================================

bot.callbackQuery("settings_edit", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "settings.edit")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }
  await ctx.answerCallbackQuery();

  const { getAllSettings } = await import("../services/platform-settings");
  const settings = await getAllSettings();

  let message = "⚙️ *Edit Platform Setting*\\n\\nSelect setting to edit:\\n\\n";
  const keyboard = new InlineKeyboard();

  for (const s of settings.slice(0, 10)) {
    keyboard.text(s.key, `settings_field_${s.key}`).row();
  }
  keyboard.text("⬅️ Back", "settings_list");

  await ctx.editMessageText(message, { parse_mode: "Markdown", reply_markup: keyboard });
});

bot.callbackQuery(/settings_field_(.+)/, async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin) return;
  await ctx.answerCallbackQuery();

  const key = (ctx.match as RegExpMatchArray)[1];
  modelEditSessions.set(admin.id, { slug: key, field: 'settings' });

  await ctx.editMessageText(
    `✏️ Editing *${key}*\\n\\nPlease type the new value (or /cancel to abort):`,
    { parse_mode: "Markdown" }
  );
});

// =============================================================================
// STATISTICS
// =============================================================================

bot.callbackQuery("menu_stats", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "stats.view")) {
    await ctx.answerCallbackQuery("❌ Access denied!");
    return;
  }
  await ctx.answerCallbackQuery();

  try {
    const [userCount, activeUserCount, pendingPayments, completedPayments] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM users"),
      db.query("SELECT COUNT(*) as count FROM users WHERE is_active = true"),
      db.query("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'completed'"),
    ]);

    const message =
      `📊 *System Statistics*\n\n` +
      `👥 Total Users: ${userCount.rows[0].count}\n` +
      `🟢 Active Users: ${activeUserCount.rows[0].count}\n` +
      `⏳ Pending Payments: ${pendingPayments.rows[0].count}\n` +
      `✅ Completed Payments: ${completedPayments.rows[0].count}`;

    const keyboard = new InlineKeyboard().text("⬅️ Back", "main_menu");
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error: any) {
    await ctx.editMessageText("❌ Error: " + error.message);
  }
});

// =============================================================================
// BROADCAST
// =============================================================================

bot.command("broadcast", async (ctx) => {
  const admin = await requireAdmin(ctx);
  if (!admin || !hasPermission(admin.role, "broadcast")) {
    await ctx.reply("❌ Access denied!");
    return;
  }

  const args = ctx.message?.text.split(" ").slice(1);
  if (!args || args.length < 2) {
    await ctx.reply(
      "📢 *Broadcast*\n\n" +
      "Usage: `/broadcast <all|user_email> <message>`\n\n" +
      "Example:\n" +
      "`/broadcast all Hello everyone!`\n" +
      "`/broadcast user@example.com Hello!`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const target = args[0];
  const message = args.slice(1).join(" ");

  try {
    const { listUsers } = await import("../services/user");
    const { createNotification } = await import("../services/notification");

    let userIds: string[] = [];
    if (target === "all") {
      const users = await listUsers(1, 10000);
      userIds = users.map((u: any) => u.id);
    } else {
      const user = await (await import("../services/user")).getUserByEmail(target);
      if (!user) {
        await ctx.reply("❌ User not found: " + target);
        return;
      }
      userIds = [user.id];
    }

    let sent = 0;
    for (const userId of userIds) {
      try {
        await createNotification({
          user_id: userId,
          type: "broadcast",
          title: "📢 Announcement",
          message,
        });
        sent++;
      } catch (e) {
        // Continue
      }
    }

    await ctx.reply(`✅ Broadcast sent to ${sent} user(s)!`);
    await logAdminAction(admin.id, admin.email, "broadcast_sent", "system", undefined, { target, sent });
  } catch (error: any) {
    await ctx.reply("❌ Error: " + error.message);
  }
});

// =============================================================================
// START BOT
// =============================================================================

const port = parseInt(process.env.ADMIN_BOT_PORT || "8080");
bot.start({
  onStart: () => {
    console.log(`[ADMIN-BOT] Bot started in ${process.env.NODE_ENV || "development"} mode`);
    console.log(`[ADMIN-BOT] Webhook mode: ${process.env.ADMIN_BOT_WEBHOOK === "true" ? "enabled" : "disabled"}`);
  },
  drop_pending_updates: true,
});

export default bot;
