"use client";

import { useCart } from "@/components/cart/CartContext";

export default function CartBadge() {
  const { itemCount } = useCart();
  if (itemCount <= 0) return null;
  return (
    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-ember text-[10px] font-medium text-void">
      {itemCount > 9 ? "9+" : itemCount}
    </span>
  );
}
