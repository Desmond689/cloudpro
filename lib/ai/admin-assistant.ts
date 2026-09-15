import "server-only";
import { callGemini, isGeminiConfigured, type GeminiMessage } from "./gemini";
import { getBusinessStats, generateDailyReport, getSalesEstimates, getPricingSuggestions } from "./business-analyst";
import { getInventoryStats } from "./inventory-agent";
import { listAbandonedCarts, processAbandonedCarts } from "./abandoned-cart-agent";
import { listOpenRiskFlags } from "./risk-agent";
import { generateProductDraft, getTodayProductDraftCount, MAX_DRAFTS_PER_DAY } from "./product-creation-agent";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Phase 11 — Admin AI Assistant
 * Controlled tools only. Real data. No unrestricted DB for Gemini.
 */

const ADMIN_SYSTEM = `You are Cloudra's admin business assistant for a vape e-commerce store.
Answer using ONLY tool results provided. Never invent orders, revenue, stock, or customers.
Be concise and actionable. Label any forecasts as estimates.
If asked to change prices or ban customers, refuse and say admin must do that manually.
If asked to create product drafts, use the create_product_drafts capability (max 3/day).`;

export async function runAdminAssistant(question: string, adminUserId?: string) {
  if (!isGeminiConfigured()) {
    return {
      ok: false as const,
      reply: "AI is unavailable (GEMINI_API_KEY missing).",
    };
  }

  const q = question.trim().slice(0, 1000);
  if (!q) return { ok: false as const, reply: "Empty question." };

  const lower = q.toLowerCase();
  const toolData: Record<string, unknown> = {};

  // Deterministic tool routing (cheaper + reliable on free tier)
  if (/today|orders|revenue|pending|attention|report|stats|business|how many|sales/.test(lower)) {
    toolData.business = await getBusinessStats();
  }
  if (/stock|inventory|low stock|out of stock/.test(lower)) {
    toolData.inventory = await getInventoryStats();
  }
  if (/abandon/.test(lower)) {
    toolData.abandonedCarts = await listAbandonedCarts(15);
  }
  if (/risk|fraud|flag|suspicious/.test(lower)) {
    toolData.riskFlags = await listOpenRiskFlags(15);
  }
  if (/forecast|estimate|demand|trend/.test(lower)) {
    toolData.estimates = await getSalesEstimates();
  }
  if (/price|pricing|discount|promo|bundle/.test(lower)) {
    toolData.pricing = await getPricingSuggestions();
  }
  if (/daily report|send report/.test(lower)) {
    toolData.dailyReport = await generateDailyReport();
  }
  if (/product draft|create.*draft|generate.*product/.test(lower)) {
    const used = await getTodayProductDraftCount();
    toolData.productDraftQuota = { used, max: MAX_DRAFTS_PER_DAY, remaining: MAX_DRAFTS_PER_DAY - used };
  }
  if (/support|escalat|human|conversation|message/.test(lower)) {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("conversations")
      .select("id, customer_name, customer_email, status, needs_human, ai_mode, updated_at")
      .or("needs_human.eq.true,status.eq.open")
      .order("updated_at", { ascending: false })
      .limit(15);
    toolData.conversations = data ?? [];
  }

  // If nothing matched, still load business overview
  if (Object.keys(toolData).length === 0) {
    toolData.business = await getBusinessStats();
    toolData.inventory = await getInventoryStats();
  }

  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [
        {
          text: `Admin question: ${q}\n\nTool data (real):\n${JSON.stringify(toolData).slice(0, 12000)}\n\nAnswer helpfully using only this data.`,
        },
      ],
    },
  ];

  try {
    const response = await callGemini({
      systemInstruction: ADMIN_SYSTEM,
      messages,
      temperature: 0.3,
      maxOutputTokens: 900,
    });

    const reply =
      response.text?.trim() ||
      "I could not form an answer from the available data. Try a more specific question.";

    const supabase = createServiceRoleClient();
    await supabase.from("ai_activity_logs").insert({
      agent: "admin_assistant",
      action: "query",
      input_summary: q.slice(0, 300),
      result_summary: reply.slice(0, 400),
      success: true,
    });

    return { ok: true as const, reply, toolData };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return { ok: false as const, reply: `AI error: ${msg}` };
  }
}

export async function getAiControlCenter() {
  const supabase = createServiceRoleClient();
  const { data: settings } = await supabase.from("ai_settings").select("*");
  const { data: rules } = await supabase.from("ai_automation_rules").select("*");
  const { data: logs } = await supabase
    .from("ai_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);
  const { count: escalations } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("needs_human", true);
  const { count: draftsToday } = await supabase
    .from("ai_product_drafts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString());
  const { count: marketingDrafts } = await supabase
    .from("ai_marketing_drafts")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");
  const risks = await listOpenRiskFlags(10);
  const abandoned = await listAbandonedCarts(10);

  return {
    settings: Object.fromEntries((settings ?? []).map((s) => [s.key, s.value])),
    rules: rules ?? [],
    logs: logs ?? [],
    escalations: escalations ?? 0,
    productDraftsToday: draftsToday ?? 0,
    marketingDraftsOpen: marketingDrafts ?? 0,
    risks,
    abandoned: abandoned.filter((c) => c.status === "open" || c.status === "reminded"),
    geminiConfigured: isGeminiConfigured(),
  };
}

export async function setAiSetting(key: string, value: boolean) {
  const supabase = createServiceRoleClient();
  await supabase.from("ai_settings").upsert({
    key,
    value: value as any,
    updated_at: new Date().toISOString(),
  });
}

export async function setAutomationEnabled(id: string, enabled: boolean) {
  const supabase = createServiceRoleClient();
  await supabase
    .from("ai_automation_rules")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id);
}
