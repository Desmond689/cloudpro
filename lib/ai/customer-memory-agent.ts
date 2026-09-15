import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Phase 14 — Customer Memory Agent
 * Stores only service-useful preferences. Not exposed publicly.
 */

export async function upsertCustomerMemoryFromOrder(opts: {
  email: string;
  categoryNames?: string[];
  productNames?: string[];
  orderTotal: number;
  orderAt: string;
}) {
  const email = opts.email.trim().toLowerCase();
  if (!email) return;

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("ai_customer_memory")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  const preferred = new Set<string>([
    ...(existing?.preferred_categories || []),
    ...(opts.categoryNames || []),
  ]);
  const interests = new Set<string>([
    ...(existing?.product_interests || []),
    ...(opts.productNames || []).slice(0, 10),
  ]);

  const totalOrders = (existing?.total_orders || 0) + 1;
  const totalSpent = Number(existing?.total_spent || 0) + Number(opts.orderTotal);

  await supabase.from("ai_customer_memory").upsert(
    {
      email,
      preferred_categories: Array.from(preferred).slice(0, 20),
      product_interests: Array.from(interests).slice(0, 30),
      last_order_at: opts.orderAt,
      total_orders: totalOrders,
      total_spent: Number(totalSpent.toFixed(2)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
}

export async function getCustomerMemory(email: string) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("ai_customer_memory")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return data;
}
