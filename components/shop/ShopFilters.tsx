"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/types";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Best rated" },
];

export default function ShopFilters({
  categories,
  activeParams,
}: {
  categories: Category[];
  activeParams: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(activeParams as Record<string, string>);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const body = (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-3">Sort</p>
        <select
          value={activeParams.sort ?? "newest"}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="eyebrow mb-3">Category</p>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => updateParam("category", null)}
            className={`text-left text-sm ${!activeParams.category ? "text-mist" : "text-mute hover:text-ink"}`}
          >
            All categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => updateParam("category", c.slug)}
              className={`text-left text-sm ${
                activeParams.category === c.slug ? "text-mist" : "text-mute hover:text-ink"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Price</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={activeParams.min ?? ""}
            onBlur={(e) => updateParam("min", e.target.value || null)}
            className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm"
          />
          <span className="text-mute">–</span>
          <input
            type="number"
            placeholder="Max"
            defaultValue={activeParams.max ?? ""}
            onBlur={(e) => updateParam("max", e.target.value || null)}
            className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Rating</p>
        <div className="flex flex-col gap-1.5">
          {[4, 3, 2].map((r) => (
            <button
              key={r}
              onClick={() => updateParam("rating", String(r))}
              className={`text-left text-sm ${
                activeParams.rating === String(r) ? "text-mist" : "text-mute hover:text-ink"
              }`}
            >
              {r}+ stars
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-mute">
        <input
          type="checkbox"
          checked={activeParams.inStock === "1"}
          onChange={(e) => updateParam("inStock", e.target.checked ? "1" : null)}
          className="h-4 w-4 rounded border-line bg-raised accent-mist"
        />
        In stock only
      </label>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">{body}</aside>

      {/* Mobile trigger + bottom sheet */}
      <div className="lg:hidden">
        <button onClick={() => setOpen(true)} className="btn-secondary mb-4 w-full">
          Filters & sort
        </button>
        {open && (
          <div className="fixed inset-0 z-50">
            <button className="absolute inset-0 bg-void/70" onClick={() => setOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-base font-semibold">Filters & sort</span>
                <button onClick={() => setOpen(false)} className="text-mute">
                  Done
                </button>
              </div>
              {body}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
