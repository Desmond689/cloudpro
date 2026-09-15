"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  runAdminAssistant,
  getAiControlCenter,
  setAiSetting,
  setAutomationEnabled,
} from "@/lib/ai/admin-assistant";
import { generateDailyReport } from "@/lib/ai/business-analyst";
import { processAbandonedCarts, trackCartIntent } from "@/lib/ai/abandoned-cart-agent";

async function requireAdmin() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!admin) return null;
  return { userId: user.id };
}

export async function askAdminAi(question: string) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, reply: "Not authorized." };
  return runAdminAssistant(question, auth.userId);
}

export async function loadAiControlCenter() {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };
  const data = await getAiControlCenter();
  return { ok: true as const, ...data };
}

export async function toggleAiSetting(key: string, value: boolean) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };
  await setAiSetting(key, value);
  revalidatePath("/admin/ai");
  return { ok: true as const };
}

export async function toggleAutomation(id: string, enabled: boolean) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };
  await setAutomationEnabled(id, enabled);
  revalidatePath("/admin/ai");
  return { ok: true as const };
}

export async function runDailyReportNow() {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };
  const report = await generateDailyReport();
  revalidatePath("/admin/ai");
  return { ok: true as const, text: report.text };
}

export async function runAbandonedCartJob() {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };
  const result = await processAbandonedCarts();
  revalidatePath("/admin/ai");
  return { ok: true as const, ...result };
}

/** Called from checkout client when email + cart known (guest checkout). */
export async function reportCartIntent(input: {
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
  return trackCartIntent(input);
}
