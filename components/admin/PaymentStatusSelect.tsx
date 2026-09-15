"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentStatus } from "@/lib/actions/admin";

const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

export default function PaymentStatusSelect({
  orderId,
  paymentStatus,
}: {
  orderId: string;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await updatePaymentStatus(orderId, value);
      if (result.ok) router.refresh();
    });
  }

  return (
    <select
      defaultValue={paymentStatus}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-line bg-raised px-2 py-1 text-xs capitalize disabled:opacity-60"
    >
      {PAYMENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
