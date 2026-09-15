"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runCustomerAgent } from "@/lib/ai/orchestrator";
import { isGeminiConfigured } from "@/lib/ai/gemini";

// Guests have no login — the conversation's UUID (kept in the browser's
// localStorage) is what proves "this is my conversation" when reading it
// back. There's no public SELECT policy on conversations/messages, so all
// reads for the customer side go through this service-role action, gated
// only by needing to already know the UUID. Good enough for a support
// widget; don't reuse this pattern for anything containing payment data.
function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function startConversation(name: string, email: string, message: string) {
  const trimmedName = name.trim().slice(0, 100);
  const trimmedEmail = email.trim().slice(0, 200);
  const trimmedMessage = message.trim().slice(0, 2000);
  if (!trimmedName || !trimmedEmail || !trimmedMessage) {
    return { ok: false as const, error: "Please fill in every field." };
  }

  const supabase = createServiceRoleClient();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      customer_name: trimmedName,
      customer_email: trimmedEmail,
      status: "open",
      ai_mode: "ai_active",
      needs_human: false,
    })
    .select()
    .single();

  if (error || !conversation) return { ok: false as const, error: "Could not start the conversation." };

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_type: "customer",
    message: trimmedMessage,
  });

  // Generate AI reply if enabled
  await maybeGenerateAiReply(conversation.id, trimmedMessage, trimmedName, trimmedEmail);

  revalidatePath("/admin/messages");
  return { ok: true as const, conversationId: conversation.id as string };
}

export async function sendCustomerMessage(conversationId: string, message: string) {
  if (!isUuid(conversationId)) return { ok: false as const, error: "Invalid conversation." };
  const trimmed = message.trim().slice(0, 2000);
  if (!trimmed) return { ok: false as const, error: "Message is empty." };

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "customer",
    message: trimmed,
  });
  if (error) return { ok: false as const, error: "Could not send message." };

  await supabase.from("conversations").update({ status: "open" }).eq("id", conversationId);

  // Load conversation for AI context
  const { data: conv } = await supabase
    .from("conversations")
    .select("ai_mode, customer_name, customer_email")
    .eq("id", conversationId)
    .single();

  if (conv?.ai_mode === "ai_active") {
    await maybeGenerateAiReply(
      conversationId,
      trimmed,
      conv.customer_name,
      conv.customer_email
    );
  }

  revalidatePath("/admin/messages");
  return { ok: true as const };
}

async function maybeGenerateAiReply(
  conversationId: string,
  customerMessage: string,
  customerName?: string | null,
  customerEmail?: string | null
) {
  if (!isGeminiConfigured()) return;

  // Respect the admin AI Control Center toggles (ai_settings). Fails open
  // (same pattern as processAbandonedCarts) so a missing row never silently
  // disables the feature — only an explicit false from the admin does.
  const settingsClient = createServiceRoleClient();
  const { data: flags } = await settingsClient
    .from("ai_settings")
    .select("key, value")
    .in("key", ["ai_enabled", "customer_ai_enabled"]);
  const disabled = (flags ?? []).some((f) => f.value === false);
  if (disabled) return;

  try {
    const result = await runCustomerAgent({
      conversationId,
      customerMessage,
      customerName,
      customerEmail,
    });

    const supabase = createServiceRoleClient();
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "ai",
      message: result.reply,
    });

    if (result.escalated) {
      // already updated by escalateToHuman tool
      revalidatePath("/admin/messages");
    }
  } catch (err) {
    console.error("[maybeGenerateAiReply]", err);
  }
}

export async function getConversation(conversationId: string) {
  if (!isUuid(conversationId)) return { ok: false as const, error: "Invalid conversation." };

  const supabase = createServiceRoleClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();
  if (!conversation) return { ok: false as const, error: "Conversation not found." };

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return {
    ok: true as const,
    conversation,
    messages: messages ?? [],
    aiConfigured: isGeminiConfigured(),
  };
}

/** Customer explicitly asks to talk to a human */
export async function requestHumanSupport(conversationId: string, reason?: string) {
  if (!isUuid(conversationId)) return { ok: false as const, error: "Invalid conversation." };

  const supabase = createServiceRoleClient();
  await supabase
    .from("conversations")
    .update({
      needs_human: true,
      ai_mode: "admin_takeover",
      escalated_at: new Date().toISOString(),
      status: "open",
    })
    .eq("id", conversationId);

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "ai",
    message:
      "Got it — I've notified a human team member. They will reply here as soon as possible. You can keep this chat open.",
  });

  try {
    const { sendTelegramText } = await import("@/lib/telegram");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    await sendTelegramText(
      `🙋 *Customer requested human*\nReason: ${reason || "Explicit request"}\n\nOpen: ${siteUrl}/admin/messages/${conversationId}`
    );
  } catch {
    // non-fatal
  }

  revalidatePath("/admin/messages");
  return { ok: true as const };
}

// ---------- admin side (real Supabase session, RLS admin_all applies) ----------

export async function adminSendMessage(conversationId: string, message: string) {
  const supabase = createServerSupabaseClient();
  const trimmed = message.trim().slice(0, 2000);
  if (!trimmed) return { ok: false as const, error: "Message is empty." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "admin",
    message: trimmed,
  });
  if (error) return { ok: false as const, error: "Could not send message." };

  // When admin replies, switch to takeover so AI stops
  const service = createServiceRoleClient();
  await service
    .from("conversations")
    .update({ ai_mode: "admin_takeover", needs_human: false })
    .eq("id", conversationId);

  revalidatePath(`/admin/messages/${conversationId}`);
  return { ok: true as const };
}

export async function resolveConversation(conversationId: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("conversations")
    .update({ status: "resolved", needs_human: false })
    .eq("id", conversationId);
  if (error) return { ok: false as const, error: "Could not resolve conversation." };

  revalidatePath("/admin/messages");
  return { ok: true as const };
}

export async function adminTakeover(conversationId: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("conversations")
    .update({ ai_mode: "admin_takeover", needs_human: false })
    .eq("id", conversationId);
  if (error) return { ok: false as const, error: "Could not take over." };
  revalidatePath(`/admin/messages/${conversationId}`);
  return { ok: true as const };
}

export async function adminResumeAi(conversationId: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("conversations")
    .update({ ai_mode: "ai_active", needs_human: false })
    .eq("id", conversationId);
  if (error) return { ok: false as const, error: "Could not resume AI." };
  revalidatePath(`/admin/messages/${conversationId}`);
  return { ok: true as const };
}
