"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartContext";

export default function CartPage() {
  const { lines, subtotal, removeItem, setQuantity, clear } = useCart();

  if (lines.length === 0) {
    return (
      <div className="container-px mx-auto max-w-7xl py-24 text-center">
        <p className="font-display text-2xl font-semibold">Your cart is empty</p>
        <p className="mt-2 text-sm text-mute">Add something you like from the shop.</p>
        <Link href="/shop" className="btn-primary mt-6 inline-flex">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto max-w-5xl py-10 sm:py-14">
      <h1 className="mb-8 font-display text-3xl font-semibold">Your cart</h1>

      <div className="flex flex-col gap-4">
        {lines.map((line) => (
          <div key={line.productId} className="card flex items-center gap-4 p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-raised">
              {line.image ? (
                <Image src={line.image} alt={line.name} fill className="object-cover" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <Link href={`/product/${line.slug}`} className="font-display text-sm font-medium hover:text-mist">
                {line.name}
              </Link>
              <p className="mt-1 font-mono text-xs text-mute">${line.price.toFixed(2)} each</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(line.productId, line.quantity - 1)}
                className="h-8 w-8 rounded-lg border border-line text-sm hover:border-mist/40"
              >
                −
              </button>
              <span className="w-6 text-center font-mono text-sm">{line.quantity}</span>
              <button
                onClick={() => setQuantity(line.productId, Math.min(line.quantity + 1, line.stock_quantity || 99))}
                className="h-8 w-8 rounded-lg border border-line text-sm hover:border-mist/40"
              >
                +
              </button>
            </div>

            <p className="w-20 text-right font-mono text-sm">${(line.price * line.quantity).toFixed(2)}</p>

            <button onClick={() => removeItem(line.productId)} className="text-xs text-mute hover:text-bad">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-end gap-3">
        <button onClick={clear} className="text-xs text-mute hover:text-bad">
          Clear cart
        </button>
        <div className="flex w-full max-w-xs flex-col gap-1 text-right">
          <div className="flex justify-between text-sm text-mute">
            <span>Subtotal</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-faint">Shipping & final total calculated at checkout.</p>
          <p className="text-xs text-faint">No account required to order.</p>
        </div>
        <div className="flex w-full max-w-xs gap-3">
          <Link href="/shop" className="btn-secondary flex-1 text-center">
            Continue shopping
          </Link>
          <Link href="/checkout" className="btn-primary flex-1 text-center">
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
