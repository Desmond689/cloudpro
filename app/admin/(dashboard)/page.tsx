import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getStats() {
  const supabase = createServerSupabaseClient();

  const [{ count: totalOrders }, { count: pendingOrders }, { count: deliveredOrders }, { count: productCount }, { data: lowStock }, { data: recentOrders }] =
    await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "pending"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "delivered"),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("products").select("id, name, stock_quantity, low_stock_threshold").order("stock_quantity", { ascending: true }).limit(5),
      supabase.from("orders").select("id, order_number, total, order_status, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

  const { data: paidOrders } = await supabase.from("orders").select("total").eq("payment_status", "paid");
  const revenue = (paidOrders ?? []).reduce((sum, o) => sum + Number(o.total), 0);

  return {
    totalOrders: totalOrders ?? 0,
    pendingOrders: pendingOrders ?? 0,
    deliveredOrders: deliveredOrders ?? 0,
    productCount: productCount ?? 0,
    revenue,
    lowStock: (lowStock ?? []).filter((p) => p.stock_quantity <= p.low_stock_threshold),
    recentOrders: recentOrders ?? [],
  };
}

export default async function AdminOverviewPage() {
  const stats = await getStats();

  const cards = [
    { label: "Total orders", value: stats.totalOrders },
    { label: "Pending orders", value: stats.pendingOrders },
    { label: "Delivered", value: stats.deliveredOrders },
    { label: "Revenue (paid)", value: `$${stats.revenue.toFixed(2)}` },
    { label: "Products", value: stats.productCount },
    { label: "Low stock", value: stats.lowStock.length },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-xl font-semibold">Overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs text-mute">{c.label}</p>
            <p className="mt-1 font-display text-xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-medium">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs text-mist hover:underline">
              View all
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-mute">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition hover:bg-raised"
                >
                  <span className="font-mono text-xs text-mute">{o.order_number}</span>
                  <span className="capitalize text-mute">{o.order_status}</span>
                  <span className="font-mono">${Number(o.total).toFixed(2)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-medium">Low stock</h2>
            <Link href="/admin/products" className="text-xs text-mist hover:underline">
              Manage
            </Link>
          </div>
          {stats.lowStock.length === 0 ? (
            <p className="py-8 text-center text-sm text-mute">Nothing low on stock.</p>
          ) : (
            <div className="space-y-2">
              {stats.lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm">
                  <span>{p.name}</span>
                  <span className="font-mono text-warn">{p.stock_quantity} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
