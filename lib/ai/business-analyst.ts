import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getInventoryStats } from "./inventory-agent";
import { listAbandonedCarts } from "./abandoned-cart-agent";
import { listOpenRiskFlags } from "./risk-agent";
import { sendTelegramText } from "./../telegram";

/**
 * Phase 12 + 13 — Business Analyst + Daily Report
 * All numbers from real DB. Forecasts labeled as estimates only.
 */

function startOfDayISO(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export async function getBusinessStats(opts?: { since?: string }) {
  const supabase = createServiceRoleClient();
  const since = opts?.since || startOfDayISO();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, total, order_status, payment_status, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const list = orders ?? [];
  const revenue = list
    .filter((o) => o.payment_status === "paid" || o.order_status === "delivered")
    .reduce((s, o) => s + Number(o.total), 0);
  const pending = list.filter(
    (o) => o.order_status === "pending" || o.payment_status === "pending"
  );

  // Top products from recent order_items
  const orderIds = list.map((o) => o.id);
  let topProducts: { name: string; qty: number; revenue: number }[] = [];
  if (orderIds.length) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity, subtotal, order_id")
      .in("order_id", orderIds);
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const i of items ?? []) {
      const cur = map.get(i.product_name) || { qty: 0, revenue: 0 };
      cur.qty += i.quantity;
      cur.revenue += Number(i.subtotal);
      map.set(i.product_name, cur);
    }
    topProducts = Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }

  const inventory = await getInventoryStats();
  const abandoned = await listAbandonedCarts(10);
  const risks = await listOpenRiskFlags(10);

  const { count: openConversations } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  const { count: needsHuman } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("needs_human", true);

  return {
    since,
    ordersToday: list.length,
    revenuePaidish: Number(revenue.toFixed(2)),
    pendingOrders: pending.length,
    pendingOrderList: pending.slice(0, 15).map((o) => ({
      id: o.id,
      order_number: o.order_number,
      total: o.total,
      status: o.order_status,
      payment: o.payment_status,
    })),
    topProducts,
    inventory: {
      lowStockCount: inventory.lowStockCount,
      outOfStockCount: inventory.outOfStockCount,
      lowStock: inventory.lowStock.slice(0, 10),
      outOfStock: inventory.outOfStock.slice(0, 10),
    },
    abandonedCartsOpen: abandoned.filter((c) => c.status === "open" || c.status === "reminded")
      .length,
    openConversations: openConversations ?? 0,
    needsHuman: needsHuman ?? 0,
    openRiskFlags: risks.length,
  };
}

export async function generateDailyReport() {
  const stats = await getBusinessStats();
  const lines = [
    `📊 *Daily business report*`,
    `Orders: ${stats.ordersToday}`,
    `Pending: ${stats.pendingOrders}`,
    `Revenue (paid/delivered): $${stats.revenuePaidish.toFixed(2)}`,
    `Low stock: ${stats.inventory.lowStockCount} | Out of stock: ${stats.inventory.outOfStockCount}`,
    `Abandoned carts: ${stats.abandonedCartsOpen}`,
    `Support open: ${stats.openConversations} (needs human: ${stats.needsHuman})`,
    `Risk flags open: ${stats.openRiskFlags}`,
    stats.topProducts.length
      ? `Top products: ${stats.topProducts
          .slice(0, 5)
          .map((p) => `${p.name} (${p.qty})`)
          .join(", ")}`
      : `Top products: —`,
    ``,
    `Recommended: review pending payments, restock low items, clear escalations.`,
  ];
  const text = lines.join("\n");

  const supabase = createServiceRoleClient();
  await supabase.from("ai_activity_logs").insert({
    agent: "daily_report",
    action: "report",
    result_summary: text.slice(0, 500),
    success: true,
  });

  try {
    await sendTelegramText(text);
  } catch {
    // non-fatal
  }

  return { text, stats };
}

/** Phase 16 — simple sales velocity estimates (labeled as estimates). */
export async function getSalesEstimates() {
  const supabase = createServiceRoleClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, product_name, quantity, subtotal, orders!inner(created_at)")
    .gte("orders.created_at", since);

  const map = new Map<
    string,
    { name: string; qty: number; revenue: number; productId: string | null }
  >();
  for (const i of items ?? []) {
    const key = i.product_id || i.product_name;
    const cur = map.get(key) || {
      name: i.product_name,
      qty: 0,
      revenue: 0,
      productId: i.product_id,
    };
    cur.qty += i.quantity;
    cur.revenue += Number(i.subtotal);
    map.set(key, cur);
  }

  const ranked = Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  const days = 30;
  const estimates = ranked.slice(0, 15).map((p) => ({
    name: p.name,
    productId: p.productId,
    unitsLast30Days: p.qty,
    revenueLast30Days: Number(p.revenue.toFixed(2)),
    estimatedDailyDemand: Number((p.qty / days).toFixed(2)),
    estimatedNext7DaysDemand: Number(((p.qty / days) * 7).toFixed(1)),
    note: "Estimate only — based on last 30 days of order items. Not a guarantee.",
  }));

  return { estimates, windowDays: 30 };
}

/** Phase 16 — pricing ideas only; never changes prices. */
export async function getPricingSuggestions() {
  const supabase = createServiceRoleClient();
  const inventory = await getInventoryStats();
  const { estimates } = await getSalesEstimates();

  const suggestions: { product: string; idea: string; reason: string }[] = [];

  for (const low of inventory.lowStock.slice(0, 5)) {
    suggestions.push({
      product: low.name,
      idea: "Consider holding price; prioritize restock over discounting.",
      reason: `Only ${low.stock} left (threshold ${low.threshold}).`,
    });
  }

  for (const e of estimates.slice(0, 5)) {
    if (e.unitsLast30Days >= 10) {
      suggestions.push({
        product: e.name,
        idea: "Strong velocity — test a small bundle or featured placement (not an automatic price cut).",
        reason: `${e.unitsLast30Days} units in 30 days (estimate).`,
      });
    }
  }

  // Slow movers: published with stock but not in top velocity
  const { data: products } = await supabase
    .from("products")
    .select("name, stock_quantity, price, is_published")
    .eq("is_published", true)
    .gt("stock_quantity", 5)
    .limit(40);
  const hotNames = new Set(estimates.slice(0, 10).map((e) => e.name));
  for (const p of products ?? []) {
    if (!hotNames.has(p.name) && suggestions.length < 12) {
      suggestions.push({
        product: p.name,
        idea: "Low recent velocity with stock on hand — consider a limited promo or bundle (admin approval required).",
        reason: `Stock ${p.stock_quantity} at $${Number(p.price).toFixed(2)}; not in top 30-day movers.`,
      });
    }
  }

  return {
    suggestions,
    disclaimer:
      "These are recommendations only. AI never changes product prices. Admin approval required.",
  };
}
