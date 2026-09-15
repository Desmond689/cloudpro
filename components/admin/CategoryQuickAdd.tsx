"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/lib/actions/admin";

export default function CategoryQuickAdd() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    const formData = new FormData();
    formData.set("name", name.trim());
    startTransition(async () => {
      const result = await createCategory(formData);
      if (!result.ok) {
        setError(result.error);
      } else {
        setName("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New category name"
        className="flex-1 rounded-xl border border-line bg-raised px-4 py-2.5 text-sm focus:border-mist/50"
      />
      <button type="submit" disabled={pending} className="btn-secondary px-4 py-2.5 text-xs disabled:opacity-60">
        {pending ? "Adding…" : "Add"}
      </button>
      {error && <p className="text-xs text-bad">{error}</p>}
    </form>
  );
}
