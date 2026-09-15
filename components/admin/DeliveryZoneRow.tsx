"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateDeliveryZone,
  toggleDeliveryZoneActive,
  deleteDeliveryZone,
} from "@/lib/actions/admin";
import type { DeliveryZone } from "@/lib/types";

export default function DeliveryZoneRow({ zone }: { zone: DeliveryZone }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(zone.name);
  const [fee, setFee] = useState(String(zone.fee));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("fee", fee);
    startTransition(async () => {
      const result = await updateDeliveryZone(zone.id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleDeliveryZoneActive(zone.id, !zone.is_active);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${zone.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteDeliveryZone(zone.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl border border-line bg-raised px-3 py-2 text-sm"
        />
        <input
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          className="w-full rounded-xl border border-line bg-raised px-3 py-2 text-sm sm:w-28"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-primary px-3 py-2 text-xs disabled:opacity-60">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary px-3 py-2 text-xs">
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-bad">{error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{zone.name}</p>
        <p className="font-mono text-xs text-mute">${Number(zone.fee).toFixed(2)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={pending}
          className={`rounded-full px-2.5 py-1 text-xs ${
            zone.is_active ? "bg-ok/15 text-ok" : "bg-raised text-mute"
          }`}
        >
          {zone.is_active ? "Active" : "Inactive"}
        </button>
        <button onClick={() => setEditing(true)} className="btn-secondary px-3 py-1.5 text-xs">
          Edit
        </button>
        <button onClick={handleDelete} disabled={pending} className="btn-secondary px-3 py-1.5 text-xs text-bad">
          Delete
        </button>
      </div>
    </div>
  );
}
