import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendTelegramText } from "@/lib/telegram";

/**
 * Phase 15 — Fraud / Risk Agent
 * Flags for review only. Never auto-bans or accuses.
 */

export async function flagOrderRisk(opts: {
  orderId: string;
  orderNumber: string;
  email?: string;
  flags: string[];
  severity?: "low" | "medium" | "high";
  summary?: string;
}) {
  if (!opts.flags.length) return;

  const supabase = createServiceRoleClient();
  await supabase.from("ai_risk_flags").insert({
    entity_type: "order",
    entity_id: opts.orderId,
    email: opts.email?.toLowerCase() || null,
    flags: opts.flags,
    severity: opts.severity || (opts.flags.length >= 2 ? "medium" : "low"),
    summary: opts.summary || `Order ${opts.orderNumber}: ${opts.flags.join(", ")}`,
    status: "open",
  });

  if (opts.severity === "high" || opts.flags.length >= 2) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      await sendTelegramText(
        `🚩 *Order flagged for review*\n${opts.orderNumber}\n${opts.flags.join(", ")}\n\n${siteUrl}/admin/orders/${opts.orderId}`
      );
    } catch {
      // non-fatal
    }
  }
}

export async function listOpenRiskFlags(limit = 30) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("ai_risk_flags")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
