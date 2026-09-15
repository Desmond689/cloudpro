"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import type { Product } from "@/lib/types";

export default function BuyNowButton({
  product,
  quantity = 1,
  flavor = null,
  requireFlavor = false,
  onMissingFlavor,
}: {
  product: Product;
  quantity?: number;
  flavor?: string | null;
  requireFlavor?: boolean;
  onMissingFlavor?: () => void;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const outOfStock = product.stock_quantity <= 0;

  function handleClick() {
    if (outOfStock) return;
    if (requireFlavor && !flavor) {
      onMissingFlavor?.();
      return;
    }
    addItem(product, quantity, flavor);
    router.push("/checkout");
  }

  return (
    <button onClick={handleClick} disabled={outOfStock} className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-40">
      Buy now
    </button>
  );
}
