import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminMessagesPage() {
  const supabase = createServerSupabaseClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Messages</h1>

      {!conversations || conversations.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">No conversations yet.</div>
      ) : (
        <div className="card divide-y divide-line">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/admin/messages/${c.id}`}
              className="flex items-center justify-between gap-3 p-4 text-sm transition hover:bg-raised"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{c.customer_name}</p>
                <p className="truncate text-xs text-mute">{c.customer_email}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.needs_human && (
                    <span className="rounded bg-bad/15 px-1.5 py-0.5 text-[10px] font-medium text-bad">
                      Needs human
                    </span>
                  )}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      c.ai_mode === "admin_takeover"
                        ? "bg-raised text-mute"
                        : "bg-ember/15 text-ember"
                    }`}
                  >
                    {c.ai_mode === "admin_takeover" ? "Admin" : "AI"}
                  </span>
                </div>
              </div>
              <span className={c.status === "open" ? "text-mist" : "text-faint"}>{c.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
