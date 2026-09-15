import "server-only";
import { callGemini, isGeminiConfigured } from "./gemini";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const MAX_DRAFTS_PER_DAY = 3;

/**
 * Phase 8 — Product Creation Agent
 * Generates DRAFT products only. Never publishes.
 * Max 3 AI drafts per calendar day (UTC).
 * Does not invent supplier-only facts; marks factual gaps for admin.
 */

export async function getTodayProductDraftCount(): Promise<number> {
  const supabase = createServiceRoleClient();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ai_product_drafts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

export async function generateProductDraft(opts: {
  prompt: string;
  adminUserId?: string | null;
}): Promise<
  | { ok: true; draftId: string; remainingToday: number }
  | { ok: false; error: string }
> {
  const used = await getTodayProductDraftCount();
  if (used >= MAX_DRAFTS_PER_DAY) {
    return {
      ok: false,
      error: `Daily limit reached (${MAX_DRAFTS_PER_DAY}/3 AI product drafts today). Try again tomorrow.`,
    };
  }

  if (!isGeminiConfigured()) {
    return { ok: false, error: "GEMINI_API_KEY is not configured." };
  }

  const supabase = createServiceRoleClient();

  const { data: flags } = await supabase
    .from("ai_settings")
    .select("key, value")
    .in("key", ["ai_enabled", "product_generation_enabled"]);
  if ((flags ?? []).some((f) => f.value === false)) {
    return { ok: false, error: "Product generation AI is turned off in the AI Control Center." };
  }

  // Real categories for grounded suggestions
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");
  const categoryList = (categories ?? [])
    .map((c) => `- ${c.name} (slug: ${c.slug})`)
    .join("\n");

  const system = `You are a product content assistant for Cloudra — a curated VAPE shop only.

ALLOWED product types (this website only sells these):
- Vape devices / kits (pod systems, mods, starter kits)
- E-liquids / e-juice / nicotine salts
- Pods, coils, cartridges
- Disposables / disposable vapes
- Vape accessories (chargers, cases, drip tips, batteries for vapes, cotton, tools related to vaping)

STRICT RULES:
1. ONLY create product drafts that fit a vape shop like Cloudra. If the admin prompt asks for something outside vaping (phones, clothes, food, unrelated electronics, etc.), return JSON with name "OUT_OF_SCOPE", description explaining it is outside the store catalog, and factual_gaps stating the request is not a Cloudra product type. Do not invent a fake vape product to force a match.
2. Output ONLY valid JSON matching the schema below. No markdown fences, no extra text.
3. NEVER invent real-world supplier facts (exact battery mAh, coil ohms, official nicotine strength, capacity) unless the admin prompt clearly provides them.
4. If factual specs are unknown, leave specifications as {} and list what the admin must fill in under factual_gaps.
5. Price and stock are suggestions only — admin sets final values. Prefer null for price if unknown.
6. Tone: clean, modern, quality-focused. No medical claims. No underage targeting. Adult audience.
7. Suggest a category ONLY from this real store list when possible:
${categoryList || "(no categories yet — still keep product in vape domain)"}
8. Descriptions must read like real product pages on this site (practical benefits, build quality, use case — not spammy hype).

JSON schema:
{
  "name": "string",
  "description": "string (2-4 short paragraphs)",
  "short_description": "string (1-2 sentences)",
  "brand": "string or null",
  "category_suggestion": "string category name or null",
  "price": number or null,
  "specifications": { "key": "value" },
  "tags": ["string"],
  "selling_points": ["string", "string", "string"],
  "seo_title": "string under 60 chars",
  "seo_description": "string under 160 chars",
  "suggested_keywords": ["string"],
  "factual_gaps": "string describing what admin must fill in",
  "ai_notes": "short note for admin"
}`;

  const userPrompt = opts.prompt.trim().slice(0, 2000);
  if (!userPrompt) return { ok: false, error: "Prompt is empty." };

  let parsed: any;
  try {
    const response = await callGemini({
      systemInstruction: system,
      messages: [{ role: "user", parts: [{ text: userPrompt }] }],
      temperature: 0.5,
      maxOutputTokens: 1200,
    });

    const raw = (response.text || "").trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ok: false, error: "AI returned invalid content. Try a clearer prompt." };
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return { ok: false, error: msg };
  }

  // Reject off-catalog (non-vape) requests
  const draftName = String(parsed.name || "").trim().toUpperCase();
  if (
    draftName === "OUT_OF_SCOPE" ||
    /out of scope|not a cloudra|outside (the )?(store|catalog)/i.test(
      String(parsed.factual_gaps || "") + " " + String(parsed.description || "")
    )
  ) {
    return {
      ok: false,
      error:
        "That request is outside Cloudra’s catalog. This studio only drafts vape products (devices, e-liquids, pods, disposables, accessories).",
    };
  }

  // Resolve category_id if suggestion matches
  let categoryId: string | null = null;
  const suggestion = String(parsed.category_suggestion || "").trim().toLowerCase();
  if (suggestion && categories) {
    const match = categories.find(
      (c) =>
        c.name.toLowerCase() === suggestion ||
        c.slug.toLowerCase() === suggestion ||
        c.name.toLowerCase().includes(suggestion)
    );
    if (match) categoryId = match.id;
  }

  const { data: draft, error } = await supabase
    .from("ai_product_drafts")
    .insert({
      status: "draft",
      name: String(parsed.name || "Untitled draft").slice(0, 200),
      description: String(parsed.description || ""),
      short_description: String(parsed.short_description || "").slice(0, 500),
      brand: parsed.brand ? String(parsed.brand).slice(0, 100) : null,
      category_suggestion: parsed.category_suggestion
        ? String(parsed.category_suggestion).slice(0, 100)
        : null,
      category_id: categoryId,
      price:
        parsed.price != null && !Number.isNaN(Number(parsed.price))
          ? Number(parsed.price)
          : null,
      stock_quantity: 0,
      low_stock_threshold: 5,
      specifications:
        parsed.specifications && typeof parsed.specifications === "object"
          ? parsed.specifications
          : {},
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 20) : [],
      selling_points: Array.isArray(parsed.selling_points)
        ? parsed.selling_points.map(String).slice(0, 10)
        : [],
      seo_title: parsed.seo_title ? String(parsed.seo_title).slice(0, 70) : null,
      seo_description: parsed.seo_description
        ? String(parsed.seo_description).slice(0, 170)
        : null,
      suggested_keywords: Array.isArray(parsed.suggested_keywords)
        ? parsed.suggested_keywords.map(String).slice(0, 15)
        : [],
      factual_gaps: parsed.factual_gaps ? String(parsed.factual_gaps).slice(0, 1000) : null,
      ai_notes: parsed.ai_notes ? String(parsed.ai_notes).slice(0, 500) : null,
      prompt: userPrompt,
      created_by: opts.adminUserId || null,
    })
    .select("id")
    .single();

  if (error || !draft) {
    console.error("[product-creation-agent]", error?.message);
    return { ok: false, error: "Could not save the draft." };
  }

  await supabase.from("ai_activity_logs").insert({
    agent: "product_creation",
    action: "create_draft",
    result_summary: `draft ${draft.id}: ${parsed.name}`,
    success: true,
  });

  const remaining = MAX_DRAFTS_PER_DAY - used - 1;
  return { ok: true, draftId: draft.id, remainingToday: remaining };
}

export { MAX_DRAFTS_PER_DAY };
