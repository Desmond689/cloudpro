"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAiMarketingDraft,
  setMarketingDraftStatus,
  updateAiMarketingDraft,
} from "@/lib/actions/ai-marketing";

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

type Draft = {
  id: string;
  status: string;
  channel: string;
  title: string | null;
  body: string;
  product_name: string | null;
  created_at: string;
};

export default function AiMarketingStudioClient({
  drafts,
  products,
}: {
  drafts: Draft[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [channel, setChannel] = useState<string>("instagram");
  const [productId, setProductId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editTitle, setEditTitle] = useState("");

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createAiMarketingDraft({
        prompt,
        channel: channel as any,
        productId: productId || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPrompt("");
      router.refresh();
    });
  }

  function startEdit(d: Draft) {
    setEditingId(d.id);
    setEditTitle(d.title || "");
    setEditBody(d.body || "");
  }

  function saveEdit() {
    if (!editingId) return;
    startTransition(async () => {
      await updateAiMarketingDraft(editingId, { title: editTitle, body: editBody });
      setEditingId(null);
      router.refresh();
    });
  }

  function setStatus(id: string, status: "approved" | "rejected" | "published") {
    startTransition(async () => {
      await setMarketingDraftStatus(id, status);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleGenerate} className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-mute">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-3 py-2 text-sm"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-mute">Product (optional)</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Announce our new pod kit for beginners, friendly tone, no fake discount…"
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
          disabled={pending}
        />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button
          type="submit"
          disabled={pending || !prompt.trim()}
          className="btn-primary disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate marketing draft"}
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Drafts</h2>
        {drafts.length === 0 ? (
          <div className="card p-8 text-center text-sm text-mute">No marketing drafts yet.</div>
        ) : (
          <div className="space-y-3">
            {drafts.map((d) => (
              <div key={d.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wide">
                    <span className="rounded bg-raised px-1.5 py-0.5 text-mute">{d.channel}</span>
                    <span className="rounded bg-raised px-1.5 py-0.5 text-mute">{d.status}</span>
                    {d.product_name && (
                      <span className="rounded bg-mist/15 px-1.5 py-0.5 text-mist">
                        {d.product_name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {d.status === "draft" && (
                      <>
                        <button type="button" onClick={() => startEdit(d)} className="hover:underline">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(d.id, "approved")}
                          className="text-ok hover:underline"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(d.id, "rejected")}
                          className="text-bad hover:underline"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {d.status === "approved" && (
                      <button
                        type="button"
                        onClick={() => setStatus(d.id, "published")}
                        className="text-mist hover:underline"
                      >
                        Mark published
                      </button>
                    )}
                  </div>
                </div>

                {editingId === d.id ? (
                  <div className="space-y-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm"
                      placeholder="Title"
                    />
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={saveEdit} className="btn-primary text-xs">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-mute"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {d.title && <p className="text-sm font-medium">{d.title}</p>}
                    <p className="whitespace-pre-wrap text-sm text-mute">{d.body}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
