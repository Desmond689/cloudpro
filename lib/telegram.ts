import "server-only";
import type { Order, OrderItem, StoreSettings } from "@/lib/types";

type TelegramSettings = Partial<
  Pick<StoreSettings, "telegram_chat_id_override" | "telegram_notify_new_order" | "telegram_message_template">
> | null;

const DEFAULT_ORDER_TEMPLATE = [
  "🛒 *New order {order_number}*",
  "",
  "*Customer:* {customer_name}",
  "*Phone:* {phone}",
  "*Email:* {email}",
  "*Address:* {address}",
  "",
  "*Items:*",
  "{items}",
  "",
  "*Total:* ${total}",
  "*Payment:* {payment_method}",
  "*Date:* {date}",
].join("\n");

// Sends the new-order alert to the store owner's Telegram chat.
// Called from the checkout Server Action after the order is safely saved —
// a Telegram failure must never block or roll back the order itself.
//
// `settings` (store_settings row) lets the store owner customize this from
// /admin/settings without a redeploy: turn the alert off entirely, point
// it at a different chat, or rewrite the message template. The bot token
// itself stays a server-only env var — that one IS a secret.
export async function sendOrderTelegramAlert(
  order: Order,
  items: OrderItem[],
  settings?: TelegramSettings
) {
  if (settings && settings.telegram_notify_new_order === false) {
    return { ok: true as const, skipped: true as const };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings?.telegram_chat_id_override?.trim() || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false as const, skipped: false as const, error: "Telegram credentials are not configured." };
  }

  const shipping = order.shipping_snapshot;
  const itemLines = items
    .map((i) => `• ${i.product_name} ×${i.quantity} — $${i.subtotal.toFixed(2)}`)
    .join("\n");

  const template = settings?.telegram_message_template?.trim() || DEFAULT_ORDER_TEMPLATE;

  const text = fillTemplate(template, {
    order_number: order.order_number,
    customer_name: shipping.fullName,
    phone: shipping.phone,
    email: shipping.email,
    address: `${shipping.address}, ${shipping.city}, ${shipping.region} ${shipping.postalCode}, ${shipping.country}`,
    items: itemLines,
    total: order.total.toFixed(2),
    payment_method: order.payment_method.toUpperCase(),
    date: new Date(order.created_at).toLocaleString(),
  });

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false as const, skipped: false as const, error: `Telegram API error: ${body}` };
    }
    return { ok: true as const, skipped: false as const };
  } catch (err) {
    return {
      ok: false as const,
      skipped: false as const,
      error: err instanceof Error ? err.message : "Unknown Telegram error",
    };
  }
}

// Generic sender used for the other admin-configurable alert types
// (low stock, new support message, AI escalations/high-intent pings) —
// same credential/toggle handling, no order-specific fields to escape.
//
// Every current caller of this function is an AI-agent-triggered ping, so
// it's the single choke point for the AI Control Center's
// `telegram_alerts_enabled` toggle — avoids repeating this check at every
// call site. New-order alerts go through sendOrderTelegramAlert above,
// gated separately by store_settings.telegram_notify_new_order, and are
// unaffected by this toggle.
export async function sendTelegramText(
  text: string,
  settings?: Pick<StoreSettings, "telegram_chat_id_override"> | null
) {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/admin");
    const supabase = createServiceRoleClient();
    const { data: flag } = await supabase
      .from("ai_settings")
      .select("value")
      .eq("key", "telegram_alerts_enabled")
      .maybeSingle();
    if (flag && flag.value === false) {
      return { ok: true as const, skipped: true as const };
    }
  } catch {
    // Fail open — a settings-lookup hiccup should never block an alert.
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings?.telegram_chat_id_override?.trim() || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { ok: false as const, error: "Telegram credentials are not configured." };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false as const, error: `Telegram API error: ${body}` };
    }
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Unknown Telegram error" };
  }
}

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value !== undefined ? escapeMd(value) : match;
  });
}

function escapeMd(s: string) {
  return s.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

/**
 * Phase 6 — Typed alert helpers (alert/control center only, not every chat message)
 */

export async function sendPaymentVerificationAlert(opts: {
  orderNumber: string;
  orderId: string;
  paymentMethod: string;
  total: number;
  customerName?: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const text = [
    `💳 *Payment needs verification*`,
    `Order: \`${opts.orderNumber}\``,
    `Method: ${opts.paymentMethod.toUpperCase()}`,
    `Total: $${Number(opts.total).toFixed(2)}`,
    opts.customerName ? `Customer: ${opts.customerName}` : null,
    ``,
    `Open: ${siteUrl}/admin/orders/${opts.orderId}`,
  ]
    .filter(Boolean)
    .join("\n");
  return sendTelegramText(text);
}

export async function sendDeliveryProblemAlert(opts: {
  orderNumber: string;
  orderId: string;
  status: string;
  note?: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const text = [
    `🚚 *Delivery problem*`,
    `Order: \`${opts.orderNumber}\``,
    `Status: ${opts.status}`,
    opts.note ? `Note: ${opts.note}` : null,
    ``,
    `Open: ${siteUrl}/admin/orders/${opts.orderId}`,
  ]
    .filter(Boolean)
    .join("\n");
  return sendTelegramText(text);
}

export async function sendSystemErrorAlert(message: string) {
  const text = `⚠️ *System alert*\n${message.slice(0, 500)}`;
  return sendTelegramText(text);
}
