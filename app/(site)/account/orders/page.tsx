import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function AccountOrdersPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("auth_user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const list = (orders ?? []) as Order[];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Order history</h1>

      {list.length === 0 ? (
        <div className="card p-6 text-sm text-mute">
          No orders yet on this account.{" "}
          <Link href="/shop" className="text-mist">
            Start shopping
          </Link>{" "}
          — or if you placed an order as a guest, use{" "}
          <Link href="/track-order" className="text-mist">
            Track Order
          </Link>{" "}
          with your order number instead.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((order) => (
            <Link
              key={order.id}
              href={`/order-confirmation/${order.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-mist/40"
            >
              <div>
                <p className="font-display text-sm font-medium">{order.order_number}</p>
                <p className="text-xs text-mute">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">${order.total.toFixed(2)}</p>
                <p className="text-xs text-mute">{STATUS_LABEL[order.order_status] ?? order.order_status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
