import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import CustomerBlockToggle from "@/components/admin/CustomerBlockToggle";

const STATUS_COLOR: Record<string, string> = {
  pending: "text-warn",
  confirmed: "text-mist",
  processing: "text-mist",
  shipped: "text-ok",
  in_transit: "text-ok",
  delivered: "text-ok",
  cancelled: "text-bad",
};

export default async function AdminCustomerDetailPage({ params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email);
  const supabase = createServerSupabaseClient();

  const { data: customerRows } = await supabase
    .from("customers")
    .select("id, full_name, phone, address, city, region, postal_code, country, created_at")
    .ilike("email", email)
    .order("created_at", { ascending: false });

  if (!customerRows || customerRows.length === 0) notFound();

  const customerIds = customerRows.map((c) => c.id);
  const latest = customerRows[0];

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, total, order_status, payment_status, created_at")
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false });

  const { data: authRows } = await supabase.rpc("get_auth_user_by_email", { target_email: email });
  const authUser = authRows?.[0] ?? null;
  const isBlocked = Boolean(authUser?.banned_until && new Date(authUser.banned_until) > new Date());

  const totalSpent = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="eyebrow mb-1">{email}</p>
        <h1 className="font-display text-xl font-semibold">{latest.full_name}</h1>
      </div>

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs text-mute">Phone</p>
          <p className="text-sm">{latest.phone}</p>
        </div>
        <div>
          <p className="text-xs text-mute">Address</p>
          <p className="text-sm">
            {latest.address}, {latest.city}, {latest.region} {latest.postal_code}, {latest.country}
          </p>
        </div>
        <div>
          <p className="text-xs text-mute">Lifetime spend</p>
          <p className="text-sm font-mono">${totalSpent.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-mute">Total orders</p>
          <p className="text-sm">{orders?.length ?? 0}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-display text-sm font-medium">Account</h2>
        {authUser ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-mute">
              Registered account · {isBlocked ? <span className="text-bad">Blocked</span> : <span className="text-ok">Active</span>}
            </p>
            <CustomerBlockToggle email={email} isBlocked={isBlocked} />
          </div>
        ) : (
          <p className="text-sm text-mute">Guest checkout only — no login to block.</p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-display text-sm font-medium">Order history</h2>
        {!orders || orders.length === 0 ? (
          <p className="text-sm text-mute">No orders.</p>
        ) : (
          <div className="divide-y divide-line">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between py-3 text-sm transition hover:opacity-80"
              >
                <div>
                  <p className="font-mono text-xs text-mute">{o.order_number}</p>
                  <p className={`text-xs capitalize ${STATUS_COLOR[o.order_status] ?? "text-mute"}`}>
                    {o.order_status.replace("_", " ")} · {o.payment_status}
                  </p>
                </div>
                <span className="font-mono">${Number(o.total).toFixed(2)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
