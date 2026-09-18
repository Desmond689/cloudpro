"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct, deleteProduct } from "@/lib/actions/admin";

type Category = { id: string; name: string };
type ProductDefaults = {
  id?: string;
  name?: string;
  description?: string;
  price?: number;
  brand?: string;
  category_id?: string | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  is_published?: boolean;
  flavors?: string[];
  wholesale_tiers?: { minQty: number; price: number }[];
};

export default function ProductForm({
  categories,
  defaults,
}: {
  categories: Category[];
  defaults?: ProductDefaults;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(defaults?.id);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (isEdit) {
        const result = await updateProduct(defaults!.id!, formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/admin/products/${defaults!.id}`);
      } else {
        const result = await createProduct(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/admin/products/${result.productId}`);
      }
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!defaults?.id) return;
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const result = await deleteProduct(defaults.id);
    if (result.ok) {
      router.push("/admin/products");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs text-mute">Product name</label>
        <input
          name="name"
          required
          defaultValue={defaults?.name}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Description</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={defaults?.description}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs text-mute">Price ($)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaults?.price}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-mute">Brand</label>
          <input
            name="brand"
            defaultValue={defaults?.brand}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs text-mute">Stock quantity</label>
          <input
            name="stock_quantity"
            type="number"
            min="0"
            required
            defaultValue={defaults?.stock_quantity ?? 0}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-mute">Low-stock threshold</label>
          <input
            name="low_stock_threshold"
            type="number"
            min="0"
            defaultValue={defaults?.low_stock_threshold ?? 5}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Category</label>
        <select
          name="category_id"
          defaultValue={defaults?.category_id ?? ""}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">
          Flavors <span className="text-faint">(comma-separated — leave blank if this product has no flavor choice)</span>
        </label>
        <input
          name="flavors"
          placeholder="Blue Razz Ice, Sour Apple, Wintergreen"
          defaultValue={defaults?.flavors?.join(", ")}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
        />
        <p className="mt-1 text-[11px] text-faint">
          When set, shoppers must pick one before adding this product to their cart.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">
          Wholesale tiers <span className="text-faint">(qty:price pairs, comma-separated — leave blank for none)</span>
        </label>
        <input
          name="wholesale_tiers"
          placeholder="10:19.99, 50:16.99, 100:14.99"
          defaultValue={defaults?.wholesale_tiers?.map((t) => `${t.minQty}:${t.price}`).join(", ")}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
        />
        <p className="mt-1 text-[11px] text-faint">
          Shown as a "buy more, pay less" table on the product page. This is separate from the /wholesale inquiry
          form for custom reseller quotes.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_published" defaultChecked={defaults?.is_published ?? false} />
        Published (visible in the shop)
      </label>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn-primary flex-1 disabled:opacity-60">
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
        {isEdit && (
          <button type="button" onClick={handleDelete} className="btn-secondary text-bad">
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
