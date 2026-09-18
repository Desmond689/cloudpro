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

const CONVERSATION_KEY = "cloudra_conversation_id";
// Remembers the visitor's name/email once they've given it — so returning
// visitors (or a fresh conversation after the old one is resolved) never
// have to retype it. This is the fix for "it keeps asking for my info".
const PROFILE_KEY = "cloudra_chat_profile";

const QUICK_STARTS = [
  "What flavors do you have?",
  "Where's my order?",
  "Do you offer wholesale pricing?",
];

function loadProfile(): { name: string; email: string } | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProfile(name: string, email: string) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, email }));
  } catch {
    // storage blocked — chat still works, just re-asks next time
  }
}

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
  const [checkingStored, setCheckingStored] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // On mount: restore a known profile immediately (so the form is
  // pre-filled even if we end up starting a fresh conversation), then
  // verify any stored conversation is still valid before trusting it.
  useEffect(() => {
    const profile = loadProfile();
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }

    const storedId = typeof window !== "undefined" ? localStorage.getItem(CONVERSATION_KEY) : null;
    if (!storedId) {
      setCheckingStored(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await getConversation(storedId);
      if (cancelled) return;
      if (result.ok) {
        setConversationId(storedId);
        setMessages(result.messages as Message[]);
        if (result.conversation?.ai_mode) setAiMode(result.conversation.ai_mode);
      } else {
        // Conversation no longer exists (resolved/cleared server-side) —
        // drop the stale id so the widget doesn't hang in limbo.
        localStorage.removeItem(CONVERSATION_KEY);
      }
      setCheckingStored(false);
    })();

    return () => {
      cancelled = true;
    };
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

  async function beginConversation(firstMessage: string) {
    const trimmedMsg = firstMessage.trim();
    if (!name.trim() || !email.trim() || !trimmedMsg) {
      setError("Please fill in every field.");
      return;
    }
    setError(null);
    setSending(true);
    setAiThinking(true);
    const result = await startConversation(name, email, trimmedMsg);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      setAiThinking(false);
      return;
    }
    saveProfile(name.trim(), email.trim());
    localStorage.setItem(CONVERSATION_KEY, result.conversationId);
    setConversationId(result.conversationId);
    setMessages([
      { id: `local-${Date.now()}`, sender_type: "customer", message: trimmedMsg, created_at: new Date().toISOString() },
    ]);
    setDraft("");
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    await beginConversation(draft);
  }

  function handleQuickStart(prompt: string) {
    beginConversation(prompt);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!conversationId || !draft.trim() || sending) return;
    const text = draft;
    setDraft("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, sender_type: "customer", message: text, created_at: new Date().toISOString() },
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

  const knownProfile = Boolean(name && email);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-3 flex h-[32rem] max-h-[75vh] w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-mist/10 to-ember/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ember text-void">✦</div>
              <div>
                <p className="text-sm font-medium text-ink">Cloudra Assistant</p>
                <p className="text-[11px] text-mute">
                  {aiMode === "admin_takeover" ? "Human support is handling this chat" : "Usually replies in seconds"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-mute hover:text-ink text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {checkingStored ? (
            <div className="flex flex-1 items-center justify-center text-xs text-mute">Loading…</div>
          ) : !conversationId ? (
            <form onSubmit={handleStart} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              <p className="text-sm font-medium text-ink">Need help finding something?</p>
              <p className="-mt-1.5 text-xs text-mute">Ask about products, orders, or shipping — we'll take it from there.</p>

              {!knownProfile && (
                <div className="grid grid-cols-2 gap-2">
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
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={sending || !name.trim() || !email.trim()}
                    onClick={() => handleQuickStart(q)}
                    className="rounded-full border border-line px-3 py-1.5 text-[11px] text-mute transition hover:border-mist/40 hover:text-ink disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <textarea
                required
                rows={3}
                placeholder="How can we help?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-raised px-3 py-2 text-sm resize-none"
              />
              {error && <p className="text-xs text-bad">{error}</p>}
              <button type="submit" disabled={sending} className="btn-primary py-2 text-xs disabled:opacity-60">
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

      {/* Floating launcher — labeled pill so it reads as help, not decoration.
          Does NOT auto-open. */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open help chat"}
        className={`flex items-center gap-2.5 rounded-full bg-ember font-display font-semibold text-void shadow-ember transition hover:scale-[1.03] active:scale-95 ${
          open ? "h-14 w-14 justify-center" : "py-3.5 pl-4 pr-5"
        }`}
      >
        {open ? (
          <span className="text-lg">✕</span>
        ) : (
          <>
            <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-void/15 text-sm">
              ✦
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-ok" />
            </span>
            <span className="text-sm leading-tight">
              Need help finding
              <br className="hidden sm:block" /> something?
            </span>
          </>
        )}
      </button>
    </div>
  );
}
