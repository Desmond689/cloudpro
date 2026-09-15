"use client";

import { useState, useTransition } from "react";
import { trackOrder } from "@/lib/actions/track-order";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

const TIMELINE: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "in_transit", "delivered"];

export default function TrackOrderPage() {
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState<(Order & { order_items: OrderItem[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const orderNumber = String(form.get("orderNumber") ?? "");
    const email = String(form.get("email") ?? "");
    setError(null);
    setOrder(null);
    startTransition(async () => {
      const result = await trackOrder(orderNumber, email);
      if (!result.ok) setError(result.error);
      else setOrder(result.order as never);
    });
  }

  const cancelled = order?.order_status === "cancelled";
  const currentIndex = order ? TIMELINE.indexOf(order.order_status) : -1;

  return (
    <div className="container-px mx-auto max-w-2xl py-14 sm:py-20">
      <p className="eyebrow mb-2 text-center">Track order</p>
      <h1 className="mb-8 text-center font-display text-3xl font-semibold">Where&apos;s my order?</h1>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-3 p-5">
        <input name="orderNumber" required placeholder="Order ID (e.g. CLD-84213)" className="input" />
        <input name="email" type="email" required placeholder="Email used at checkout" className="input" />
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Looking up…" : "Track order"}
        </button>
        {error && <p className="text-xs text-bad">{error}</p>}
      </form>

      {order && (
        <div className="card mt-6 p-6">
          <div className="flex items-center justify-between">
            <p className="font-mono text-lg">{order.order_number}</p>
            <span className="font-mono text-xs text-mute">{new Date(order.created_at).toLocaleDateString()}</span>
          </div>

          {!cancelled ? (
            <div className="mt-6 flex items-center justify-between">
              {TIMELINE.map((step, i) => (
                <div key={step} className="flex flex-1 flex-col items-center text-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      i <= currentIndex ? "bg-mist" : "bg-line"
                    }`}
                  />
                  <p className={`mt-2 text-[10px] capitalize ${i <= currentIndex ? "text-ink" : "text-faint"}`}>
                    {step.replace("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 font-mono text-sm text-bad">Order cancelled</p>
          )}

          <div className="vapor-divider my-6" />

          <div className="flex flex-col gap-2">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-mute">
                  {item.product_name} × {item.quantity}
                </span>
                <span className="font-mono">${item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="vapor-divider my-6" />

          <div className="flex justify-between font-display text-base font-semibold">
            <span>Total</span>
            <span className="font-mono">${order.total.toFixed(2)}</span>
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-mute">Payment</span>
            <span className="font-mono capitalize">{order.payment_status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
