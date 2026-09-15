import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import AdminConversationView from "@/components/admin/AdminConversationView";

export default async function AdminMessageDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();

  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase.from("conversations").select("*").eq("id", params.id).single(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!conversation) notFound();

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <p className="eyebrow mb-1">{conversation.customer_name}</p>
        <h1 className="font-display text-xl font-semibold">{conversation.customer_email}</h1>
        {conversation.needs_human && (
          <p className="mt-1 text-xs font-medium text-bad">⚠ Marked as needing human attention</p>
        )}
      </div>
      <AdminConversationView
        conversationId={conversation.id}
        initialMessages={messages ?? []}
        status={conversation.status}
        aiMode={conversation.ai_mode ?? "ai_active"}
        needsHuman={conversation.needs_human ?? false}
      />
    </div>
  );
}
