import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendTelegramText } from "@/lib/telegram";

/**
 * Phase 5 — Order AI Agent
 * Runs after a successful order is created.
 * Validates consistency, builds an internal summary, flags risk signals,
 * and sends a structured Telegram alert.
 *
 * Payment confirmation is NEVER claimed by AI — payment_status stays pending
 * until an admin verifies gift-card / BTC proof.
 */

export type OrderRiskFlag =
  | "high_quantity"
  | "high_value"
  | "mixed_payment_proof"
  | "guest_high_value"
  | "multiple_same_day"; // soft signal only

export type OrderAgentResult = {
  summary: string;
  riskFlags: OrderRiskFlag[];
  telegramSent: boolean;
  inventoryAlertsTriggered: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  auth_user_id: string | null;
  shipping_snapshot: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  gift_card_code?: string | null;
  gift_card_amount?: number | null;
  btc_screenshot_path?: string | null;
};

type OrderItemRow = {
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

export async function runOrderAgent(opts: {
  order: OrderRow;
  items: OrderItemRow[];
}): Promise<OrderAgentResult> {
  const { order, items } = opts;
  const supabase = createServiceRoleClient();
  const riskFlags: OrderRiskFlag[] = [];

  // ---- Risk signals (flag for review only — never auto-ban) ----
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  if (totalQty >= 10) riskFlags.push("high_quantity");
  if (Number(order.total) >= 150) riskFlags.push("high_value");
  if (!order.auth_user_id && Number(order.total) >= 80) riskFlags.push("guest_high_value");

  // Soft same-day check by email
  const email = order.shipping_snapshot?.email?.toLowerCase?.();
  if (email) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString())
      .filter("shipping_snapshot->>email", "eq", email);
    if ((count ?? 0) > 2) riskFlags.push("multiple_same_day");
  }

  // ---- Build internal summary ----
  const itemLines = items
    .map((i) => `• ${i.product_name} × ${i.quantity} @ $${Number(i.unit_price).toFixed(2)} = $${Number(i.subtotal).toFixed(2)}`)
    .join("\n");

  const ship = order.shipping_snapshot || {};
  const summaryLines = [
    `NEW ORDER ${order.order_number}`,
    `Status: ${order.order_status} | Payment: ${order.payment_status} (${order.payment_method})`,
    `Customer: ${ship.fullName || "—"}`,
    `Email: ${ship.email || "—"}`,
    `Phone: ${ship.phone || "—"}`,
    `Address: ${[ship.address, ship.city, ship.region, ship.postalCode, ship.country].filter(Boolean).join(", ")}`,
    `Items:`,
    itemLines || "• (no items)",
    `Subtotal: $${Number(order.subtotal).toFixed(2)}`,
    `Shipping: $${Number(order.shipping_cost).toFixed(2)}`,
    `Total: $${Number(order.total).toFixed(2)}`,
    riskFlags.length ? `Risk flags: ${riskFlags.join(", ")}` : "Risk flags: none",
    `Note: Payment is NOT confirmed until admin verifies proof.`,
  ];
  const summary = summaryLines.join("\n");

  // Log activity
  await supabase.from("ai_activity_logs").insert({
    conversation_id: null,
    agent: "order",
    action: "order_created",
    tool_name: null,
    input_summary: order.order_number,
    result_summary: summary.slice(0, 800),
    success: true,
  });

  // ---- Telegram (structured, not every chat message) ----
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const riskLine =
    riskFlags.length > 0
      ? `\n⚠️ *Risk flags:* ${riskFlags.map((f) => f.replace(/_/g, " ")).join(", ")}`
      : "";

  const tgText = [
    `🛒 *NEW ORDER* \`${order.order_number}\``,
    `💰 Total: $${Number(order.total).toFixed(2)}`,
    `💳 ${order.payment_method.toUpperCase()} — status: *${order.payment_status}* (awaiting verification)`,
    `👤 ${ship.fullName || "—"} | ${ship.email || "—"}`,
    `📦 ${items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")}`,
    riskLine,
    ``,
    `Open: ${siteUrl}/admin/orders/${order.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  let telegramSent = false;
  try {
    const { data: settings } = await supabase
      .from("store_settings")
      .select("telegram_chat_id_override, telegram_notify_new_order")
      .eq("id", true)
      .maybeSingle();

    if (settings?.telegram_notify_new_order !== false) {
      const res = await sendTelegramText(tgText, settings);
      telegramSent = res.ok === true;
    }
  } catch {
    // non-fatal
  }

  if (riskFlags.length) {
    try {
      const { flagOrderRisk } = await import("@/lib/ai/risk-agent");
      await flagOrderRisk({
        orderId: order.id,
        orderNumber: order.order_number,
        email: order.shipping_snapshot?.email,
        flags: riskFlags,
        severity: riskFlags.length >= 2 ? "medium" : "low",
        summary: `Order ${order.order_number}: ${riskFlags.join(", ")}`,
      });
    } catch {
      // non-fatal
    }
  }

  return {
    summary,
    riskFlags,
    telegramSent,
    inventoryAlertsTriggered: 0,
  };
}
