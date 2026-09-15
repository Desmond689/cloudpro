"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCustomerBlocked } from "@/lib/actions/admin";

export default function CustomerBlockToggle({ email, isBlocked }: { email: string; isBlocked: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const next = !isBlocked;
    if (next && !confirm(`Block ${email}? They won't be able to sign in until unblocked.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await setCustomerBlocked(email, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className={`btn-secondary px-3 py-1.5 text-xs disabled:opacity-60 ${isBlocked ? "" : "text-bad"}`}
      >
        {pending ? "Updating…" : isBlocked ? "Unblock account" : "Block account"}
      </button>
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
}
