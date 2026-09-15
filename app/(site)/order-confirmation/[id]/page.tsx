import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import CopyOrderId from "@/components/order/CopyOrderId";

export default async function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const supabase = createServiceRoleClient();
  const { data: order } = await supabase.from("orders").select("*, order_items(*)").eq("id", params.id).single();

  if (!order) notFound();

  return (
    <div className="container-px mx-auto max-w-2xl py-16 text-center sm:py-24">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-ok/10 text-ok">
        ✓
      </div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Thank you — order placed</h1>
      <p className="mt-2 text-sm text-mute">A confirmation has been recorded for your order.</p>

      <div className="card mt-8 p-6 text-left">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Order ID</p>
          <CopyOrderId orderNumber={order.order_number} />
        </div>
        <p className="mt-1 font-mono text-lg">{order.order_number}</p>

        <div className="vapor-divider my-5" />

        <div className="flex flex-col gap-2">
          {order.order_items.map((item: { id: string; product_name: string; quantity: number; subtotal: number }) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-mute">
                {item.product_name} × {item.quantity}
              </span>
              <span className="font-mono">${item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="vapor-divider my-5" />

        <div className="flex justify-between font-display text-base font-semibold">
          <span>Total</span>
          <span className="font-mono">${order.total.toFixed(2)}</span>
        </div>

        <div className="mt-4 flex justify-between text-sm">
          <span className="text-mute">Payment status</span>
          <span className="font-mono capitalize">{order.payment_status}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-mute">Order status</span>
          <span className="font-mono capitalize">{order.order_status}</span>
        </div>
      </div>

      <Link href="/track-order" className="btn-primary mt-8 inline-flex">
        Track this order
      </Link>
    </div>
  );
}
