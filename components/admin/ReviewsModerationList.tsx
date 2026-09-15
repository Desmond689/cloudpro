"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveReview, deleteReview } from "@/lib/actions/admin";

type ReviewRow = {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  is_approved: boolean;
  created_at: string;
  products: { name: string } | null;
};

export default function ReviewsModerationList({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveReview(id);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    startTransition(async () => {
      await deleteReview(id);
      router.refresh();
    });
  }

  if (reviews.length === 0) {
    return <div className="card p-10 text-center text-sm text-mute">No reviews to moderate.</div>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="card p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium">{r.customer_name}</p>
            <span className="font-mono text-xs text-mist">{"★".repeat(r.rating)}</span>
          </div>
          <p className="mb-2 text-xs text-mute">{r.products?.name ?? "Unknown product"}</p>
          <p className="mb-3 text-sm">{r.review_text}</p>
          <div className="flex gap-2">
            {!r.is_approved && (
              <button
                onClick={() => handleApprove(r.id)}
                disabled={pending}
                className="btn-secondary px-3 py-1.5 text-xs text-ok disabled:opacity-60"
              >
                Approve
              </button>
            )}
            <button
              onClick={() => handleDelete(r.id)}
              disabled={pending}
              className="btn-secondary px-3 py-1.5 text-xs text-bad disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
