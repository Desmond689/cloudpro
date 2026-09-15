import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import AccountSignOutButton from "@/components/account/AccountSignOutButton";

const ACCOUNT_LINKS = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Wishlist", href: "/account/wishlist" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders — middleware already redirects unauthenticated
  // visitors away from /account/*, this just avoids a flash of the shell.
  if (!user) return <>{children}</>;

  return (
    <div className="container-px mx-auto max-w-7xl py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">My account</p>
          <p className="text-sm text-mute">{user.email}</p>
        </div>
        <AccountSignOutButton />
      </div>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {ACCOUNT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-mute transition hover:bg-raised hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
