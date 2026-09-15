"use client";

import { useEffect, useRef, useState } from "react";
import {
  startConversation,
  sendCustomerMessage,
  getConversation,
  requestHumanSupport,
} from "@/lib/actions/messages";

type Message = {
  id: string;
  sender_type: "customer" | "admin" | "ai";
  message: string;
  created_at: string;
};

const STORAGE_KEY = "cloudra_conversation_id";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiMode, setAiMode] = useState<"ai_active" | "admin_takeover">("ai_active");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setConversationId(stored);
  }, []);

  useEffect(() => {
    if (!conversationId || !open) return;
    let cancelled = false;

    async function poll() {
      const result = await getConversation(conversationId!);
      if (!cancelled && result.ok) {
        setMessages(result.messages as Message[]);
        if (result.conversation?.ai_mode) {
          setAiMode(result.conversation.ai_mode);
        }
        // If we were waiting for AI and a new AI message appeared, stop thinking
        const last = (result.messages as Message[])?.at(-1);
        if (last?.sender_type === "ai" || last?.sender_type === "admin") {
          setAiThinking(false);
        }
      }
    }
    poll();
    const interval = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiThinking]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    setAiThinking(true);
    const result = await startConversation(name, email, draft);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      setAiThinking(false);
      return;
    }
    localStorage.setItem(STORAGE_KEY, result.conversationId);
    setConversationId(result.conversationId);
    setDraft("");
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!conversationId || !draft.trim() || sending) return;
    const text = draft;
    setDraft("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        sender_type: "customer",
        message: text,
        created_at: new Date().toISOString(),
      },
    ]);
    if (aiMode === "ai_active") setAiThinking(true);
    await sendCustomerMessage(conversationId, text);
    setSending(false);
  }

  async function handleTalkToHuman() {
    if (!conversationId) return;
    setAiThinking(false);
    await requestHumanSupport(conversationId, "Customer clicked Talk to a human");
    setAiMode("admin_takeover");
  }

  function bubbleClass(sender: string) {
    if (sender === "customer") return "ml-auto bg-mist/15 text-ink";
    if (sender === "ai") return "bg-raised border border-line/60";
    return "bg-raised"; // admin
  }

  function senderLabel(sender: string) {
    if (sender === "ai") return "Cloudra AI";
    if (sender === "admin") return "Support";
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-3 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-line bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Cloudra Assistant</p>
              <p className="text-[11px] text-mute">
                {aiMode === "admin_takeover"
                  ? "Human support is handling this chat"
                  : "AI can help with products, stock & orders"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-mute hover:text-ink text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {!conversationId ? (
            <form onSubmit={handleStart} className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-xs text-mute mb-1">
                Need help finding something? Ask us anything.
              </p>
              <input
                required
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-line bg-raised px-3 py-2 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-line bg-raised px-3 py-2 text-sm"
              />
              <textarea
                required
                rows={3}
                placeholder="How can we help?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-raised px-3 py-2 text-sm resize-none"
              />
              {error && <p className="text-xs text-bad">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="btn-primary py-2 text-xs disabled:opacity-60"
              >
                {sending ? "Starting…" : "Start chat"}
              </button>
            </form>
          ) : (
            <>
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[88%] rounded-xl px-3 py-2 text-sm ${bubbleClass(m.sender_type)}`}>
                    {senderLabel(m.sender_type) && (
                      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-mute">
                        {senderLabel(m.sender_type)}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))}
                {aiThinking && (
                  <div className="max-w-[70%] rounded-xl border border-line/60 bg-raised px-3 py-2 text-sm text-mute">
                    <span className="inline-flex items-center gap-1">
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse delay-75">●</span>
                      <span className="animate-pulse delay-150">●</span>
                      <span className="ml-1 text-xs">Thinking…</span>
                    </span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {aiMode === "ai_active" && (
                <div className="border-t border-line px-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTalkToHuman}
                    className="text-[11px] text-mute underline hover:text-ink"
                  >
                    Talk to a human instead
                  </button>
                </div>
              )}

              <form onSubmit={handleReply} className="flex gap-2 border-t border-line p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  disabled={sending}
                  className="flex-1 rounded-lg border border-line bg-raised px-3 py-2 text-sm disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="btn-primary px-3 text-xs disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating button — does NOT auto-open */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open AI assistant"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-ember text-void shadow-ember transition hover:scale-105"
      >
        {open ? "✕" : "✦"}
      </button>
    </div>
  );
}
