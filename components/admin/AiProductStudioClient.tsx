"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createAiProductDraft,
  rejectAiProductDraft,
  publishAiProductDraft,
} from "@/lib/actions/ai-products";

type Draft = {
  id: string;
  status: string;
  name: string | null;
  short_description: string | null;
  price: number | null;
  brand: string | null;
  category_suggestion: string | null;
  factual_gaps: string | null;
  created_at: string;
  published_product_id: string | null;
};

export default function AiProductStudioClient({
  remainingToday,
  drafts,
}: {
  usedToday: number;
  maxPerDay: number;
  remainingToday: number;
  drafts: Draft[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createAiProductDraft(prompt);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPrompt("");
      router.push(`/admin/ai-products/${result.draftId}`);
      router.refresh();
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      await rejectAiProductDraft(id);
      router.refresh();
    });
  }

  function handlePublish(id: string, live: boolean) {
    startTransition(async () => {
      const result = await publishAiProductDraft(id, { publishLive: live });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      if (result.productId) {
        router.push(`/admin/products/${result.productId}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleGenerate} className="card space-y-3 p-4">
        <label className="block text-xs text-mute">
          Describe the product you want to draft (name ideas, category, features you know)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="e.g. Beginner pod kit, refillable, under $35 — or fruit nicotine salt 30ml, 20mg… (vape products only)"
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
          disabled={remainingToday <= 0 || pending}
        />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button
          type="submit"
          disabled={remainingToday <= 0 || pending || !prompt.trim()}
          className="btn-primary disabled:opacity-60"
        >
          {pending
            ? "Generating…"
            : remainingToday <= 0
              ? "Daily limit reached"
              : "Generate draft"}
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-ink">Drafts</h2>
        {drafts.length === 0 ? (
          <div className="card p-8 text-center text-sm text-mute">No AI product drafts yet.</div>
        ) : (
          <div className="card divide-y divide-line">
            {drafts.map((d) => (
              <div key={d.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/admin/ai-products/${d.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {d.name || "Untitled draft"}
                  </Link>
                  <p className="truncate text-xs text-mute">
                    {d.brand || "No brand"} · {d.category_suggestion || "No category"} ·{" "}
                    {d.price != null ? `$${Number(d.price).toFixed(2)}` : "Price TBD"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] uppercase text-mute">
                      {d.status}
                    </span>
                    {d.factual_gaps && (
                      <span className="rounded bg-ember/15 px-1.5 py-0.5 text-[10px] text-ember">
                        Needs facts
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/ai-products/${d.id}`}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Edit
                  </Link>
                  {d.status === "draft" || d.status === "approved" ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handlePublish(d.id, false)}
                        className="btn-secondary px-3 py-1.5 text-xs"
                        title="Create product as unpublished"
                      >
                        Create product
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handlePublish(d.id, true)}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        Publish live
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleReject(d.id)}
                        className="text-xs text-bad hover:underline"
                      >
                        Reject
                      </button>
                    </>
                  ) : d.published_product_id ? (
                    <Link
                      href={`/admin/products/${d.published_product_id}`}
                      className="text-xs text-mist hover:underline"
                    >
                      View product
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
