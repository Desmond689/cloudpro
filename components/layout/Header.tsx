import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";
import MobileNav from "@/components/layout/MobileNav";
import Logo from "@/components/ui/Logo";
import { Search, ShoppingBag } from "@/components/ui/Icons";
import CartBadge from "@/components/cart/CartBadge";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = createServerSupabaseClient();
  const { data: settings } = await supabase
    .from("public_store_settings")
    .select("social_instagram, social_tiktok, social_youtube, social_facebook, social_x, social_whatsapp")
    .maybeSingle();

  const socialEntries = Object.entries({
    instagram: settings?.social_instagram ?? "",
    tiktok: settings?.social_tiktok ?? "",
    youtube: settings?.social_youtube ?? "",
    facebook: settings?.social_facebook ?? "",
    x: settings?.social_x ?? "",
    whatsapp: settings?.social_whatsapp ?? "",
  }).filter(([, url]) => Boolean(url)) as [string, string][];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-void/85 backdrop-blur-md">
      <div className="container-px mx-auto flex h-16 max-w-7xl items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="Cloudra home">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-mute transition hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/search"
            aria-label="Search products"
            className="text-mute transition hover:text-ink"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/account"
            className="text-sm text-mute transition hover:text-ink"
          >
            Account
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative text-mute transition hover:text-ink"
          >
            <ShoppingBag className="h-5 w-5" />
            <CartBadge />
          </Link>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-4 lg:hidden">
          <Link href="/search" aria-label="Search products" className="text-mute">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/cart" aria-label="Cart" className="relative text-mute">
            <ShoppingBag className="h-5 w-5" />
            <CartBadge />
          </Link>
          <MobileNav socialEntries={socialEntries} />
        </div>
      </div>
    </header>
  );
}
