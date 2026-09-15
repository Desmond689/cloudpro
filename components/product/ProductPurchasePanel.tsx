"use client";

import { useState } from "react";
import AddToCartButton from "@/components/cart/AddToCartButton";
import BuyNowButton from "@/components/cart/BuyNowButton";
import type { Product } from "@/lib/types";

/**
 * The flavor selector + purchase buttons for a product detail page, as one
 * client component so the required-flavor error state can live in one
 * place. Server page stays a server component; only this panel is client.
 */
export default function ProductPurchasePanel({ product }: { product: Product }) {
  const flavors = product.flavors ?? [];
  const hasFlavors = flavors.length > 0;
  const [flavor, setFlavor] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  function selectFlavor(f: string) {
    setFlavor(f);
    setShowError(false);
  }

  function handleMissingFlavor() {
    setShowError(true);
  }

  return (
    <div>
      {hasFlavors && (
        <div className="mt-6">
          <p className="eyebrow mb-3">
            Choose flavor <span className="text-ember">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {flavors.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => selectFlavor(f)}
                aria-pressed={flavor === f}
                className={
                  flavor === f
                    ? "rounded-full border border-mist bg-mist/15 px-4 py-2 text-xs font-medium text-mist transition"
                    : "rounded-full border border-line px-4 py-2 text-xs font-medium text-mute transition hover:border-mist/40 hover:text-ink"
                }
              >
                {f}
              </button>
            ))}
          </div>
          {showError && (
            <p className="mt-2 text-xs text-bad">Please select a flavor before adding this to your cart.</p>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <AddToCartButton
          product={product}
          flavor={flavor}
          requireFlavor={hasFlavors}
          onMissingFlavor={handleMissingFlavor}
        />
        <BuyNowButton
          product={product}
          flavor={flavor}
          requireFlavor={hasFlavors}
          onMissingFlavor={handleMissingFlavor}
        />
      </div>
    </div>
  );
}
