"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateMarketingDraft, type MarketingChannel } from "@/lib/ai/marketing-agent";

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

export async function getMarketingStudioData() {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const { data: drafts } = await auth.supabase
    .from("ai_marketing_drafts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: products } = await auth.supabase
    .from("products")
    .select("id, name")
    .eq("is_published", true)
    .order("name")
    .limit(100);

  return {
    ok: true as const,
    drafts: drafts ?? [],
    products: products ?? [],
  };
}

export async function createAiMarketingDraft(input: {
  prompt: string;
  channel?: MarketingChannel;
  productId?: string | null;
}) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const result = await generateMarketingDraft({
    prompt: input.prompt,
    channel: input.channel,
    productId: input.productId,
    adminUserId: auth.userId,
  });

  if (!result.ok) return result;
  revalidatePath("/admin/ai-marketing");
  return result;
}

export async function updateAiMarketingDraft(
  draftId: string,
  fields: { title?: string; body?: string; channel?: string }
) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const { error } = await auth.supabase
    .from("ai_marketing_drafts")
    .update({
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.body !== undefined ? { body: fields.body } : {}),
      ...(fields.channel !== undefined ? { channel: fields.channel } : {}),
    })
    .eq("id", draftId)
    .in("status", ["draft", "approved"]);

  if (error) return { ok: false as const, error: "Could not update." };
  revalidatePath("/admin/ai-marketing");
  return { ok: true as const };
}

export async function setMarketingDraftStatus(
  draftId: string,
  status: "approved" | "rejected" | "published"
) {
  const auth = await requireAdmin();
  if (!auth) return { ok: false as const, error: "Not authorized." };

  const { error } = await auth.supabase
    .from("ai_marketing_drafts")
    .update({
      status,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (error) return { ok: false as const, error: "Could not update status." };
  revalidatePath("/admin/ai-marketing");
  return { ok: true as const };
}
