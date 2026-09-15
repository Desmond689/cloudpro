import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AccountOverviewPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: orderCount }, { count: wishlistCount }, { count: addressCount }] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("auth_user_id", user?.id ?? ""),
    supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("user_id", user?.id ?? ""),
    supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("user_id", user?.id ?? ""),
  ]);

  const stats = [
    { label: "Orders", value: orderCount ?? 0, href: "/account/orders" },
    { label: "Saved addresses", value: addressCount ?? 0, href: "/account/addresses" },
    { label: "Wishlist items", value: wishlistCount ?? 0, href: "/account/wishlist" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Welcome back</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:border-mist/40">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="mt-1 text-xs text-mute">{s.label}</p>
          </Link>
        ))}
      </div>
      <p className="text-sm text-mute">
        Orders placed as a guest before creating an account won't show up here — only orders placed
        while signed in are linked to your account.
      </p>
    </div>
  );
}
