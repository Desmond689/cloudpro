"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus, updatePaymentStatus, resendTelegramAlert } from "@/lib/actions/admin";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "in_transit", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

export default function OrderStatusControls({
  orderId,
  orderStatus,
  paymentStatus,
  telegramNotified,
}: {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  telegramNotified: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleOrderStatus(value: string) {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, value);
      if (result.ok) router.refresh();
    });
  }

  function handlePaymentStatus(value: string) {
    startTransition(async () => {
      const result = await updatePaymentStatus(orderId, value);
      if (result.ok) router.refresh();
    });
  }

  function handleResend() {
    startTransition(async () => {
      const result = await resendTelegramAlert(orderId);
      setMessage(result.ok ? "Telegram alert sent." : `Failed: ${result.error}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-xs text-mute">Order status</label>
        <select
          defaultValue={orderStatus}
          disabled={pending}
          onChange={(e) => handleOrderStatus(e.target.value)}
          className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 text-sm capitalize disabled:opacity-60"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Payment status</label>
        <select
          defaultValue={paymentStatus}
          disabled={pending}
          onChange={(e) => handlePaymentStatus(e.target.value)}
          className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 text-sm capitalize disabled:opacity-60"
        >
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <button onClick={handleResend} disabled={pending} className="btn-secondary text-xs disabled:opacity-60">
          {telegramNotified ? "Resend Telegram alert" : "Send Telegram alert"}
        </button>
        {message && <p className="mt-2 text-xs text-mute">{message}</p>}
      </div>
    </div>
  );
}
