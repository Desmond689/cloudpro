"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  generateProductDraft,
  getTodayProductDraftCount,
  MAX_DRAFTS_PER_DAY,
} from "@/lib/ai/product-creation-agent";

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
  return { supabase, userId: user.id };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function getProductStudioData() {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const supabase = createServiceRoleClient();
  const used = await getTodayProductDraftCount();

  const { data: drafts } = await supabase
    .from("ai_product_drafts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return {
    ok: true as const,
    usedToday: used,
    maxPerDay: MAX_DRAFTS_PER_DAY,
    remainingToday: Math.max(0, MAX_DRAFTS_PER_DAY - used),
    drafts: drafts ?? [],
    categories: categories ?? [],
  };
}

export async function createAiProductDraft(prompt: string) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const result = await generateProductDraft({
    prompt,
    adminUserId: auth.userId,
  });

  if (!result.ok) return result;

  revalidatePath("/admin/ai-products");
  return result;
}

export async function updateAiProductDraft(
  draftId: string,
  fields: Record<string, unknown>
) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const allowed: Record<string, unknown> = {};
  const keys = [
    "name",
    "description",
    "short_description",
    "brand",
    "category_suggestion",
    "category_id",
    "price",
    "stock_quantity",
    "low_stock_threshold",
    "specifications",
    "tags",
    "selling_points",
    "seo_title",
    "seo_description",
    "suggested_keywords",
    "factual_gaps",
    "ai_notes",
  ];
  for (const k of keys) {
    if (k in fields) allowed[k] = fields[k];
  }

  // Normalize
  if ("price" in allowed && allowed.price !== null && allowed.price !== "") {
    allowed.price = Number(allowed.price);
  }
  if ("stock_quantity" in allowed) {
    allowed.stock_quantity = Number(allowed.stock_quantity ?? 0);
  }
  if ("low_stock_threshold" in allowed) {
    allowed.low_stock_threshold = Number(allowed.low_stock_threshold ?? 5);
  }
  if ("category_id" in allowed && !allowed.category_id) {
    allowed.category_id = null;
  }

  const { error } = await auth.supabase
    .from("ai_product_drafts")
    .update(allowed)
    .eq("id", draftId)
    .in("status", ["draft", "approved"]);

  if (error) return { ok: false as const, error: "Could not update draft." };

  revalidatePath("/admin/ai-products");
  revalidatePath(`/admin/ai-products/${draftId}`);
  return { ok: true as const };
}

export async function rejectAiProductDraft(draftId: string) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const { error } = await auth.supabase
    .from("ai_product_drafts")
    .update({
      status: "rejected",
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (error) return { ok: false as const, error: "Could not reject draft." };
  revalidatePath("/admin/ai-products");
  return { ok: true as const };
}

/**
 * Publish draft → real product (is_published = false by default so admin can still review in Products).
 * Admin can toggle publish on the product page.
 */
export async function publishAiProductDraft(
  draftId: string,
  opts?: { publishLive?: boolean }
) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const { data: draft } = await auth.supabase
    .from("ai_product_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (!draft) return { ok: false as const, error: "Draft not found." };
  if (draft.status === "published") {
    return { ok: false as const, error: "Already published." };
  }
  if (draft.status === "rejected") {
    return { ok: false as const, error: "Rejected drafts cannot be published." };
  }

  const name = String(draft.name || "").trim();
  const price = Number(draft.price ?? 0);
  if (!name) return { ok: false as const, error: "Draft needs a product name." };
  if (price < 0) return { ok: false as const, error: "Invalid price." };

  const stock = Number(draft.stock_quantity ?? 0);
  const service = createServiceRoleClient();

  const { data: product, error } = await service
    .from("products")
    .insert({
      name,
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`,
      description: String(draft.description || draft.short_description || ""),
      price,
      brand: draft.brand || "",
      category_id: draft.category_id || null,
      stock_quantity: stock < 0 ? 0 : stock,
      low_stock_threshold: Number(draft.low_stock_threshold ?? 5),
      specifications: draft.specifications || {},
      is_published: opts?.publishLive === true,
    })
    .select("id")
    .single();

  if (error || !product) {
    console.error("[publishAiProductDraft]", error?.message);
    return { ok: false as const, error: "Could not create product from draft." };
  }

  await auth.supabase
    .from("ai_product_drafts")
    .update({
      status: "published",
      published_product_id: product.id,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  revalidatePath("/admin/ai-products");
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  return { ok: true as const, productId: product.id as string };
}

export async function getAiProductDraft(draftId: string) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const { data: draft } = await auth.supabase
    .from("ai_product_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (!draft) return { ok: false as const, error: "Not found." };

  const { data: categories } = await auth.supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return { ok: true as const, draft, categories: categories ?? [] };
}
