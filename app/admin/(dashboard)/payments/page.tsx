import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import PaymentStatusSelect from "@/components/admin/PaymentStatusSelect";

const STATUS_COLOR: Record<string, string> = {
  pending: "text-warn",
  paid: "text-ok",
  failed: "text-bad",
  refunded: "text-mute",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createServerSupabaseClient();
  const statusFilter = searchParams.status;

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, total, payment_method, payment_status, payment_reference, created_at, shipping_snapshot"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter && ["pending", "paid", "failed", "refunded"].includes(statusFilter)) {
    query = query.eq("payment_status", statusFilter);
  }

  const { data: payments } = await query;
  const { data: allOrders } = await supabase.from("orders").select("total, payment_status");

  const rows = allOrders ?? [];
  const totals = {
    paid: rows.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0),
    pending: rows.filter((o) => o.payment_status === "pending").length,
    failed: rows.filter((o) => o.payment_status === "failed").length,
    refunded: rows.filter((o) => o.payment_status === "refunded").length,
  };

  const filters = [
    { label: "All", value: undefined },
    { label: "Pending", value: "pending" },
    { label: "Paid", value: "paid" },
    { label: "Failed", value: "failed" },
    { label: "Refunded", value: "refunded" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Payments</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-mute">Confirmed revenue</p>
          <p className="mt-1 font-display text-lg font-semibold">${totals.paid.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-mute">Pending</p>
          <p className="mt-1 font-display text-lg font-semibold text-warn">{totals.pending}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-mute">Failed</p>
          <p className="mt-1 font-display text-lg font-semibold text-bad">{totals.failed}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-mute">Refunded</p>
          <p className="mt-1 font-display text-lg font-semibold">{totals.refunded}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/payments?status=${f.value}` : "/admin/payments"}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              statusFilter === f.value ? "border-mist bg-mist/10 text-ink" : "border-line text-mute"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!payments || payments.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">No payments match this filter.</div>
      ) : (
        <div className="card divide-y divide-line">
          {payments.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link href={`/admin/orders/${p.id}`} className="font-mono text-xs text-mist hover:underline">
                  {p.order_number}
                </Link>
                <p className="truncate">{p.shipping_snapshot?.fullName ?? "—"}</p>
                <p className="text-xs text-mute">
                  {p.payment_method.toUpperCase()}
                  {p.payment_reference && <> · Ref: {p.payment_reference}</>} ·{" "}
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono">${Number(p.total).toFixed(2)}</span>
                <span className={`text-xs capitalize ${STATUS_COLOR[p.payment_status] ?? "text-mute"}`}>
                  {p.payment_status}
                </span>
                <PaymentStatusSelect orderId={p.id} paymentStatus={p.payment_status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
