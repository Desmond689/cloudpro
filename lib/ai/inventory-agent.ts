import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendTelegramText } from "@/lib/telegram";

/**
 * Phase 7 — Inventory Agent
 * Checks products that just had stock decremented (or any products you pass).
 * Sends low-stock / out-of-stock alerts via Telegram + activity log.
 * Thresholds come from each product's low_stock_threshold (already in schema).
 */

export type InventoryAlert = {
  productId: string;
  name: string;
  slug: string;
  stock: number;
  threshold: number;
  type: "low_stock" | "out_of_stock";
};

export async function runInventoryCheck(opts?: {
  /** If provided, only check these product IDs (typical after an order). */
  productIds?: string[];
  /** Force notify even if settings toggle is off (default false). */
  forceNotify?: boolean;
}): Promise<{ alerts: InventoryAlert[]; notified: boolean }> {
  const supabase = createServiceRoleClient();

  let q = supabase
    .from("products")
    .select("id, name, slug, stock_quantity, low_stock_threshold, is_published")
    .eq("is_published", true);

  if (opts?.productIds?.length) {
    q = q.in("id", opts.productIds);
  } else {
    // Full scan: only products at or below threshold (or zero)
    q = q.or("stock_quantity.eq.0,stock_quantity.lte.low_stock_threshold");
  }

  const { data: products, error } = await q;
  if (error || !products) {
    console.error("[inventory-agent]", error?.message);
    return { alerts: [], notified: false };
  }

  const alerts: InventoryAlert[] = [];

  for (const p of products) {
    const stock = Number(p.stock_quantity ?? 0);
    const threshold = Number(p.low_stock_threshold ?? 5);

    if (stock <= 0) {
      alerts.push({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        stock,
        threshold,
        type: "out_of_stock",
      });
    } else if (stock <= threshold) {
      alerts.push({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        stock,
        threshold,
        type: "low_stock",
      });
    }
  }

  if (alerts.length === 0) {
    return { alerts: [], notified: false };
  }

  // Log each alert
  for (const a of alerts) {
    await supabase.from("ai_activity_logs").insert({
      agent: "inventory",
      action: a.type,
      tool_name: null,
      input_summary: a.slug,
      result_summary: `${a.name}: stock=${a.stock}, threshold=${a.threshold}`,
      success: true,
    });
  }

  // Telegram (respect store setting when present)
  let notified = false;
  try {
    const { data: settings } = await supabase
      .from("store_settings")
      .select("telegram_chat_id_override, telegram_notify_low_stock")
      .eq("id", true)
      .maybeSingle();

    const allowed = opts?.forceNotify || settings?.telegram_notify_low_stock !== false;
    if (allowed) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const lines = alerts.map((a) => {
        const icon = a.type === "out_of_stock" ? "🔴" : "🟡";
        return `${icon} *${a.name}* — stock: ${a.stock} (threshold ${a.threshold})\n   /shop/${a.slug}`;
      });

      const text = [
        `📦 *Inventory alert* (${alerts.length})`,
        ...lines,
        ``,
        `Admin products: ${siteUrl}/admin/products`,
      ].join("\n");

      const res = await sendTelegramText(text, settings);
      notified = res.ok === true;
    }
  } catch (err) {
    console.error("[inventory-agent telegram]", err);
  }

  return { alerts, notified };
}

/**
 * Lightweight stats for admin AI / daily reports later.
 */
export async function getInventoryStats() {
  const supabase = createServiceRoleClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, stock_quantity, low_stock_threshold, is_published")
    .eq("is_published", true);

  const list = products ?? [];
  const outOfStock = list.filter((p) => Number(p.stock_quantity) <= 0);
  const lowStock = list.filter(
    (p) =>
      Number(p.stock_quantity) > 0 &&
      Number(p.stock_quantity) <= Number(p.low_stock_threshold ?? 5)
  );

  return {
    totalPublished: list.length,
    outOfStock: outOfStock.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      stock: p.stock_quantity,
    })),
    lowStock: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      stock: p.stock_quantity,
      threshold: p.low_stock_threshold,
    })),
    outOfStockCount: outOfStock.length,
    lowStockCount: lowStock.length,
  };
}
