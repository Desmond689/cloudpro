"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import type { Product } from "@/lib/types";

export default function AddToCartButton({
  product,
  compact = false,
  quantity = 1,
  flavor = null,
  requireFlavor = false,
  onMissingFlavor,
}: {
  product: Product;
  compact?: boolean;
  quantity?: number;
  /** Selected flavor, if the product has flavor options. */
  flavor?: string | null;
  /** When true, clicking without a flavor selected calls onMissingFlavor instead of adding. */
  requireFlavor?: boolean;
  onMissingFlavor?: () => void;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock_quantity <= 0;

  function handleClick() {
    if (outOfStock) return;
    if (requireFlavor && !flavor) {
      onMissingFlavor?.();
      return;
    }
    addItem(product, quantity, flavor);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <button
      onClick={handleClick}
      disabled={outOfStock}
      className={
        compact
          ? "w-full rounded-lg border border-line py-2 text-xs font-medium text-ink transition hover:border-mist/50 hover:text-mist disabled:cursor-not-allowed disabled:opacity-40"
          : "btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
      }
    >
      {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
