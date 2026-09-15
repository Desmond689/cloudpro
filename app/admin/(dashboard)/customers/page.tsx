import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createServerSupabaseClient();
  const q = searchParams.q?.trim();

  let query = supabase
    .from("customer_summary")
    .select("*")
    .order("last_order_at", { ascending: false, nullsFirst: false });

  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: customers } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Customers</h1>
        <p className="text-xs text-mute">{customers?.length ?? 0} total</p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, or phone"
          className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 text-sm focus:border-mist/50"
        />
        <button type="submit" className="btn-secondary px-4 py-2.5 text-xs">
          Search
        </button>
      </form>

      {!customers || customers.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">
          {q ? "No customers match your search." : "No customers yet — they show up here after their first order."}
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {customers.map((c) => (
            <Link
              key={c.email}
              href={`/admin/customers/${encodeURIComponent(c.email)}`}
              className="flex items-center justify-between gap-3 p-4 text-sm transition hover:bg-raised"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{c.full_name ?? "—"}</p>
                <p className="truncate text-xs text-mute">
                  {c.email} {c.phone ? `· ${c.phone}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm">${Number(c.total_spent).toFixed(2)}</p>
                <p className="text-xs text-mute">
                  {c.total_orders} order{c.total_orders === 1 ? "" : "s"}
                  {c.is_registered ? " · registered" : " · guest"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
