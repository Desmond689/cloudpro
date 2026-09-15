"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDeliveryZone } from "@/lib/actions/admin";

export default function DeliveryZoneForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createDeliveryZone(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        name="name"
        required
        placeholder="Zone name, e.g. Douala metro"
        className="flex-1 rounded-xl border border-line bg-raised px-4 py-2.5 text-sm focus:border-mist/50"
      />
      <input
        name="fee"
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="Fee"
        className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 text-sm focus:border-mist/50 sm:w-32"
      />
      <button type="submit" disabled={pending} className="btn-secondary px-4 py-2.5 text-xs disabled:opacity-60">
        {pending ? "Adding…" : "Add zone"}
      </button>
      {error && <p className="text-xs text-bad sm:self-center">{error}</p>}
    </form>
  );
}
