"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateAiProductDraft,
  publishAiProductDraft,
  rejectAiProductDraft,
} from "@/lib/actions/ai-products";

type Draft = Record<string, any>;

export default function AiProductDraftEditor({
  draft,
  categories,
}: {
  draft: Draft;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const locked = draft.status === "published" || draft.status === "rejected";

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked) return;
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);

    const tags = String(fd.get("tags") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const selling = String(fd.get("selling_points") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const keywords = String(fd.get("suggested_keywords") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let specifications: Record<string, string> = {};
    try {
      const raw = String(fd.get("specifications") || "{}");
      specifications = JSON.parse(raw);
    } catch {
      setError("Specifications must be valid JSON object.");
      return;
    }

    startTransition(async () => {
      const result = await updateAiProductDraft(draft.id, {
        name: fd.get("name"),
        description: fd.get("description"),
        short_description: fd.get("short_description"),
        brand: fd.get("brand") || null,
        category_id: fd.get("category_id") || null,
        category_suggestion: fd.get("category_suggestion") || null,
        price: fd.get("price") === "" ? null : fd.get("price"),
        stock_quantity: fd.get("stock_quantity"),
        low_stock_threshold: fd.get("low_stock_threshold"),
        specifications,
        tags,
        selling_points: selling,
        seo_title: fd.get("seo_title") || null,
        seo_description: fd.get("seo_description") || null,
        suggested_keywords: keywords,
        factual_gaps: fd.get("factual_gaps") || null,
        ai_notes: fd.get("ai_notes") || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Draft saved.");
      router.refresh();
    });
  }

  function handlePublish(live: boolean) {
    startTransition(async () => {
      const result = await publishAiProductDraft(draft.id, { publishLive: live });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/products/${result.productId}`);
      router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectAiProductDraft(draft.id);
      router.push("/admin/ai-products");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSave} className="card space-y-4 p-4">
      {draft.ai_notes && (
        <p className="rounded-lg bg-raised px-3 py-2 text-xs text-mute">
          AI note: {draft.ai_notes}
        </p>
      )}

      <div>
        <label className="mb-1 block text-xs text-mute">Name</label>
        <input
          name="name"
          required
          defaultValue={draft.name ?? ""}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">Short description</label>
        <textarea
          name="short_description"
          rows={2}
          defaultValue={draft.short_description ?? ""}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">Full description</label>
        <textarea
          name="description"
          rows={5}
          defaultValue={draft.description ?? ""}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-mute">Brand</label>
          <input
            name="brand"
            defaultValue={draft.brand ?? ""}
            disabled={locked}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mute">Price ($)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={draft.price ?? ""}
            disabled={locked}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-mute">Stock</label>
          <input
            name="stock_quantity"
            type="number"
            min="0"
            defaultValue={draft.stock_quantity ?? 0}
            disabled={locked}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mute">Low-stock threshold</label>
          <input
            name="low_stock_threshold"
            type="number"
            min="0"
            defaultValue={draft.low_stock_threshold ?? 5}
            disabled={locked}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">Category</label>
        <select
          name="category_id"
          defaultValue={draft.category_id ?? ""}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input type="hidden" name="category_suggestion" defaultValue={draft.category_suggestion ?? ""} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">Selling points (one per line)</label>
        <textarea
          name="selling_points"
          rows={3}
          defaultValue={(draft.selling_points || []).join("\n")}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">Tags (comma-separated)</label>
        <input
          name="tags"
          defaultValue={(draft.tags || []).join(", ")}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">Specifications (JSON)</label>
        <textarea
          name="specifications"
          rows={4}
          defaultValue={JSON.stringify(draft.specifications || {}, null, 2)}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 font-mono text-xs"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">SEO title</label>
        <input
          name="seo_title"
          defaultValue={draft.seo_title ?? ""}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">SEO description</label>
        <textarea
          name="seo_description"
          rows={2}
          defaultValue={draft.seo_description ?? ""}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">Keywords (comma-separated)</label>
        <input
          name="suggested_keywords"
          defaultValue={(draft.suggested_keywords || []).join(", ")}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">Factual gaps (admin must verify)</label>
        <textarea
          name="factual_gaps"
          rows={2}
          defaultValue={draft.factual_gaps ?? ""}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mute">AI notes</label>
        <textarea
          name="ai_notes"
          rows={2}
          defaultValue={draft.ai_notes ?? ""}
          disabled={locked}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm"
        />
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}
      {success && <p className="text-sm text-ok">{success}</p>}

      {!locked && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
            {pending ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handlePublish(false)}
            className="btn-secondary"
          >
            Create product (unpublished)
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handlePublish(true)}
            className="btn-primary"
          >
            Publish live
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleReject}
            className="text-sm text-bad hover:underline"
          >
            Reject
          </button>
        </div>
      )}
    </form>
  );
}
