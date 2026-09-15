import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendTelegramText } from "@/lib/telegram";

/**
 * Phase 10 — Abandoned Cart Agent
 * Cart is client-side; we track intent when email + cart snapshot is reported
 * (checkout start or explicit save). Reminders are optional and admin-controlled.
 */

export async function trackCartIntent(input: {
  email: string;
  customerName?: string;
  phone?: string;
  cartLines: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    slug?: string;
  }[];
  checkoutStarted?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.cartLines?.length) {
    return { ok: false as const, error: "Email and cart lines required." };
  }

  const supabase = createServiceRoleClient();
  const subtotal = input.cartLines.reduce(
    (s, l) => s + Number(l.price) * Number(l.quantity),
    0
  );

  // Upsert open cart for this email
  const { data: existing } = await supabase
    .from("abandoned_carts")
    .select("id, status")
    .eq("email", email)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("abandoned_carts")
      .update({
        customer_name: input.customerName || null,
        phone: input.phone || null,
        cart_snapshot: input.cartLines,
        subtotal: Number(subtotal.toFixed(2)),
        checkout_started: input.checkoutStarted ?? false,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return { ok: true as const, id: existing.id };
  }

  const { data, error } = await supabase
    .from("abandoned_carts")
    .insert({
      email,
      customer_name: input.customerName || null,
      phone: input.phone || null,
      cart_snapshot: input.cartLines,
      subtotal: Number(subtotal.toFixed(2)),
      checkout_started: input.checkoutStarted ?? false,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false as const, error: "Could not track cart." };
  }
  return { ok: true as const, id: data.id };
}

export async function markCartRecovered(email: string, orderId: string) {
  const supabase = createServiceRoleClient();
  await supabase
    .from("abandoned_carts")
    .update({
      status: "recovered",
      recovered_order_id: orderId,
    })
    .eq("email", email.trim().toLowerCase())
    .in("status", ["open", "reminded"]);
}

/** Process open carts older than delay — mark reminded + optional Telegram to admin (not spam to customer by default). */
export async function processAbandonedCarts() {
  const supabase = createServiceRoleClient();

  const { data: settings } = await supabase
    .from("ai_settings")
    .select("key, value")
    .eq("key", "abandoned_cart_enabled")
    .maybeSingle();
  if (settings && settings.value === false) {
    return { processed: 0, skipped: true };
  }

  const { data: rule } = await supabase
    .from("ai_automation_rules")
    .select("*")
    .eq("id", "abandoned_cart")
    .maybeSingle();
  if (rule && rule.enabled === false) {
    return { processed: 0, skipped: true };
  }

  const delayHours = Number((rule?.config as any)?.delay_hours ?? 2);
  const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000).toISOString();

  const { data: carts } = await supabase
    .from("abandoned_carts")
    .select("*")
    .eq("status", "open")
    .lt("last_seen_at", cutoff)
    .limit(20);

  let processed = 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  for (const cart of carts ?? []) {
    await supabase
      .from("abandoned_carts")
      .update({ status: "reminded", reminder_sent_at: new Date().toISOString() })
      .eq("id", cart.id);

    // Admin alert only (do not email/spam customer unless you add explicit consent later)
    try {
      const items = Array.isArray(cart.cart_snapshot)
        ? cart.cart_snapshot
            .map((l: any) => `${l.name} ×${l.quantity}`)
            .join(", ")
        : "—";
      await sendTelegramText(
        `🛒 *Abandoned cart*\n${cart.email}\n$${Number(cart.subtotal).toFixed(2)}\n${items}\n\nAdmin: ${siteUrl}/admin/ai`
      );
    } catch {
      // non-fatal
    }

    await supabase.from("ai_activity_logs").insert({
      agent: "abandoned_cart",
      action: "reminded",
      result_summary: `${cart.email} $${cart.subtotal}`,
      success: true,
    });
    processed++;
  }

  return { processed, skipped: false };
}

export async function listAbandonedCarts(limit = 30) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("abandoned_carts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
