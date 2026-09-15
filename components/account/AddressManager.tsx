"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAddress, deleteAddress, setDefaultAddress } from "@/lib/actions/account";
import type { CustomerAddress } from "@/lib/types";

export default function AddressManager({ addresses }: { addresses: CustomerAddress[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [rowPending, setRowPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(addresses.length === 0);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addAddress(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setShowForm(false);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    setRowPending(id);
    startTransition(async () => {
      await deleteAddress(id);
      setRowPending(null);
      router.refresh();
    });
  }

  function handleSetDefault(id: string) {
    setRowPending(id);
    startTransition(async () => {
      await setDefaultAddress(id);
      setRowPending(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {addresses.map((a) => (
        <div key={a.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
          <div>
            <p className="font-display text-sm font-medium">
              {a.label} {a.is_default && <span className="ml-2 text-xs text-mist">Default</span>}
            </p>
            <p className="mt-1 text-sm text-mute">{a.full_name}</p>
            <p className="text-sm text-mute">
              {a.address}, {a.city}, {a.region} {a.postal_code}, {a.country}
            </p>
            <p className="text-sm text-mute">{a.phone}</p>
          </div>
          <div className="flex gap-2">
            {!a.is_default && (
              <button
                onClick={() => handleSetDefault(a.id)}
                disabled={rowPending === a.id}
                className="btn-secondary text-xs disabled:opacity-60"
              >
                Set default
              </button>
            )}
            <button
              onClick={() => handleDelete(a.id)}
              disabled={rowPending === a.id}
              className="btn-secondary text-xs text-bad disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {showForm ? (
        <form ref={formRef} action={handleSubmit} className="card space-y-3 p-5">
          <h2 className="font-display text-sm font-medium">Add an address</h2>
          <input name="label" placeholder="Label (e.g. Home, Work)" className="input w-full" />
          <input name="full_name" required placeholder="Full name" className="input w-full" />
          <input name="phone" required placeholder="Phone" className="input w-full" />
          <input name="address" required placeholder="Address" className="input w-full" />
          <div className="grid grid-cols-2 gap-3">
            <input name="city" required placeholder="City" className="input" />
            <input name="region" required placeholder="State / Region" className="input" />
            <input name="postal_code" required placeholder="Postal code" className="input" />
            <input name="country" required placeholder="Country" className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_default" defaultChecked={addresses.length === 0} />
            Make default
          </label>
          {error && <p className="text-sm text-bad">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary flex-1 disabled:opacity-60">
              {pending ? "Saving…" : "Save address"}
            </button>
            {addresses.length > 0 && (
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn-secondary">
          + Add address
        </button>
      )}
    </div>
  );
}
