"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/lib/actions/reviews";
import { Star } from "@/components/ui/Icons";

export default function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function handleSubmit(formData: FormData) {
    formData.set("rating", String(rating));
    startTransition(async () => {
      const res = await submitReview(formData);
      setResult(res);
    });
  }

  if (result?.ok) {
    return (
      <p className="font-mono text-sm text-ok">
        Thanks — your review is awaiting approval and will appear once it's checked.
      </p>
    );
  }

  return (
    <form action={handleSubmit} className="card max-w-md p-5">
      <input type="hidden" name="productId" value={productId} />
      <p className="mb-3 font-display text-sm font-medium">Leave a review</p>

      <div className="mb-3 flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1} stars`}>
            <Star className="h-5 w-5 text-mist" filled={i < rating} />
          </button>
        ))}
      </div>

      <input
        name="customerName"
        placeholder="Your name"
        required
        className="mb-3 w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm placeholder:text-faint"
      />
      <textarea
        name="reviewText"
        placeholder="What did you think?"
        required
        rows={3}
        className="mb-3 w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm placeholder:text-faint"
      />

      {result?.error && <p className="mb-3 text-xs text-bad">{result.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
