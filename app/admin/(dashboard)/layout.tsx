import Link from "next/link";
import { SITE } from "@/lib/constants";
import SignOutButton from "@/components/admin/SignOutButton";
import AdminMobileNav from "@/components/admin/AdminMobileNav";

const ADMIN_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "AI Control", href: "/admin/ai" },
  { label: "AI Products", href: "/admin/ai-products" },
  { label: "AI Marketing", href: "/admin/ai-marketing" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Wholesale", href: "/admin/wholesale" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Delivery", href: "/admin/delivery" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Blog", href: "/admin/blog" },
  { label: "Settings", href: "/admin/settings" },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-void">
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur lg:pl-64">
        <Link href="/admin" className="font-display text-sm font-semibold">
          {SITE.name} admin
        </Link>
        <div className="flex items-center gap-3">
          <SignOutButton />
          <AdminMobileNav links={ADMIN_LINKS} />
        </div>
      </div>

      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-line bg-surface pt-14 lg:block">
        <nav className="flex flex-col gap-1 p-4">
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-mute transition hover:bg-raised hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="px-4 py-6 lg:pl-60 lg:pr-6">{children}</main>
    </div>
  );
}
