import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const STATUS_COLOR: Record<string, string> = {
  pending: "text-warn",
  confirmed: "text-mist",
  processing: "text-mist",
  shipped: "text-ok",
  in_transit: "text-ok",
  delivered: "text-ok",
  cancelled: "text-bad",
};

export default async function AdminOrdersPage() {
  const supabase = createServerSupabaseClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, customer_id, total, order_status, payment_status, created_at, shipping_snapshot")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Orders</h1>

      {!orders || orders.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">No orders yet.</div>
      ) : (
        <div className="card divide-y divide-line">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="flex items-center justify-between gap-3 p-4 text-sm transition hover:bg-raised"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-mute">{o.order_number}</p>
                <p className="truncate">{o.shipping_snapshot?.fullName ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className={`text-xs capitalize ${STATUS_COLOR[o.order_status] ?? "text-mute"}`}>
                  {o.order_status.replace("_", " ")}
                </p>
                <p className="font-mono">${Number(o.total).toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
