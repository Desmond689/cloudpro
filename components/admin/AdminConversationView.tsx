"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  adminSendMessage,
  resolveConversation,
  adminTakeover,
  adminResumeAi,
} from "@/lib/actions/messages";

type Message = {
  id: string;
  sender_type: "customer" | "admin" | "ai";
  message: string;
  created_at: string;
};

export default function AdminConversationView({
  conversationId,
  initialMessages,
  status,
  aiMode = "ai_active",
  needsHuman = false,
}: {
  conversationId: string;
  initialMessages: Message[];
  status: string;
  aiMode?: "ai_active" | "admin_takeover";
  needsHuman?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [currentMode, setCurrentMode] = useState(aiMode);
  const [currentNeedsHuman, setCurrentNeedsHuman] = useState(needsHuman);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    await adminSendMessage(conversationId, text);
    setCurrentMode("admin_takeover");
    setCurrentNeedsHuman(false);
  }

  async function handleResolve() {
    await resolveConversation(conversationId);
  }

  async function handleTakeover() {
    await adminTakeover(conversationId);
    setCurrentMode("admin_takeover");
    setCurrentNeedsHuman(false);
  }

  async function handleResumeAi() {
    await adminResumeAi(conversationId);
    setCurrentMode("ai_active");
  }

  function bubbleClass(sender: string) {
    if (sender === "admin") return "ml-auto bg-mist/15";
    if (sender === "ai") return "bg-ember/10 border border-ember/30";
    return "bg-raised";
  }

  function label(sender: string) {
    if (sender === "ai") return "AI";
    if (sender === "admin") return "You";
    return "Customer";
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={status === "open" ? "text-mist" : "text-faint"}>{status}</span>
          <span className="text-faint">·</span>
          <span className={currentMode === "ai_active" ? "text-ember" : "text-mute"}>
            {currentMode === "ai_active" ? "AI Active" : "Admin Takeover"}
          </span>
          {currentNeedsHuman && (
            <span className="rounded bg-bad/20 px-1.5 py-0.5 text-[10px] font-medium text-bad">
              Needs human
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentMode === "ai_active" ? (
            <button
              onClick={handleTakeover}
              className="text-xs text-mute hover:text-ink"
              title="Stop AI and take over"
            >
              Take over
            </button>
          ) : (
            <button
              onClick={handleResumeAi}
              className="text-xs text-mute hover:text-ink"
              title="Let AI handle replies again"
            >
              Resume AI
            </button>
          )}
          {status === "open" && (
            <button onClick={handleResolve} className="text-xs text-mute hover:text-ink">
              Mark resolved
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${bubbleClass(m.sender_type)}`}>
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-mute">
              {label(m.sender_type)}
            </p>
            <p className="whitespace-pre-wrap">{m.message}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Reply as admin…"
          className="flex-1 rounded-lg border border-line bg-raised px-3 py-2 text-sm"
        />
        <button type="submit" className="btn-primary px-4 text-xs">
          Send
        </button>
      </form>
    </div>
  );
}
