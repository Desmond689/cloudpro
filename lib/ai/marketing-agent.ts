import "server-only";
import { callGemini, isGeminiConfigured } from "./gemini";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Phase 9 — Marketing Agent
 * Generates marketing drafts only. Admin must approve before any publish/use.
 */

const CHANNELS = [
  "general",
  "instagram",
  "tiktok",
  "whatsapp",
  "facebook",
  "x",
  "email",
  "sms",
  "banner",
  "video_script",
  "product_hook",
  "campaign",
] as const;

export type MarketingChannel = (typeof CHANNELS)[number];

export async function generateMarketingDraft(opts: {
  prompt: string;
  channel?: MarketingChannel;
  productId?: string | null;
  adminUserId?: string | null;
}): Promise<{ ok: true; draftId: string } | { ok: false; error: string }> {
  if (!isGeminiConfigured()) {
    return { ok: false, error: "GEMINI_API_KEY is not configured." };
  }

  const settingsClient = createServiceRoleClient();
  const { data: flags } = await settingsClient
    .from("ai_settings")
    .select("key, value")
    .in("key", ["ai_enabled", "marketing_ai_enabled"]);
  if ((flags ?? []).some((f) => f.value === false)) {
    return { ok: false, error: "Marketing AI is turned off in the AI Control Center." };
  }

  const channel = (opts.channel || "general") as MarketingChannel;
  if (!CHANNELS.includes(channel)) {
    return { ok: false, error: "Invalid channel." };
  }

  const supabase = createServiceRoleClient();
  let productContext = "";
  let productName: string | null = null;

  if (opts.productId) {
    const { data: product } = await supabase
      .from("products")
      .select("id, name, description, price, brand, stock_quantity, is_published")
      .eq("id", opts.productId)
      .maybeSingle();
    if (product) {
      productName = product.name;
      productContext = `Product (real data only):
- Name: ${product.name}
- Brand: ${product.brand || "—"}
- Price: $${Number(product.price).toFixed(2)}
- In stock: ${product.stock_quantity > 0 ? "yes" : "no"}
- Description excerpt: ${String(product.description || "").slice(0, 300)}
Use only these facts. Do not invent discounts or stock claims.`;
    }
  }

  const system = `You are a marketing copywriter for Cloudra, a curated vape shop.
Write for channel: ${channel}.
Rules:
1. Output ONLY valid JSON: { "title": "string", "body": "string" }
2. No markdown fences.
3. Never invent discounts, free shipping, medical claims, or stock urgency unless the prompt/product data includes them.
4. Tone: modern, clean, adult audience. No hype spam.
5. Keep body appropriate length for the channel (short for WhatsApp/SMS/X; longer for email/campaign).
${productContext}`;

  const userPrompt = opts.prompt.trim().slice(0, 2000);
  if (!userPrompt) return { ok: false, error: "Prompt is empty." };

  let parsed: any;
  try {
    const response = await callGemini({
      systemInstruction: system,
      messages: [{ role: "user", parts: [{ text: userPrompt }] }],
      temperature: 0.6,
      maxOutputTokens: 800,
    });
    const raw = (response.text || "").trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ok: false, error: "AI returned invalid content." };
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Generation failed",
    };
  }

  const { data: draft, error } = await supabase
    .from("ai_marketing_drafts")
    .insert({
      status: "draft",
      channel,
      title: parsed.title ? String(parsed.title).slice(0, 200) : null,
      body: String(parsed.body || "").slice(0, 5000),
      product_id: opts.productId || null,
      product_name: productName,
      prompt: userPrompt,
      created_by: opts.adminUserId || null,
    })
    .select("id")
    .single();

  if (error || !draft) {
    console.error("[marketing-agent]", error?.message);
    return { ok: false, error: "Could not save marketing draft." };
  }

  await supabase.from("ai_activity_logs").insert({
    agent: "marketing",
    action: "create_draft",
    result_summary: `${channel}: ${parsed.title || draft.id}`,
    success: true,
  });

  return { ok: true, draftId: draft.id };
}
