"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import type { Product } from "@/lib/types";

export default function BuyNowButton({ product, quantity = 1 }: { product: Product; quantity?: number }) {
  const { addItem } = useCart();
  const router = useRouter();
  const outOfStock = product.stock_quantity <= 0;

  function handleClick() {
    if (outOfStock) return;
    addItem(product, quantity);
    router.push("/checkout");
  }

  return (
    <button onClick={handleClick} disabled={outOfStock} className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-40">
      Buy now
    </button>
  );
}
