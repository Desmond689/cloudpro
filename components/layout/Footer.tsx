import Link from "next/link";
import { NAV_LINKS, SITE } from "@/lib/constants";
import Logo from "@/components/ui/Logo";
import { Lock } from "@/components/ui/Icons";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const POLICY_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "FAQ", href: "/faq" },
];

export default async function Footer() {
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
  }).filter(([, url]) => Boolean(url));

  return (
    <footer className="border-t border-line/80 bg-surface">
      <div className="container-px mx-auto max-w-7xl py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" aria-label="Cloudra home">
              <Logo />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-mute">{SITE.description}</p>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-faint">
              <Lock className="h-3.5 w-3.5" />
              Encrypted checkout on every order
            </p>
          </div>

          <div>
            <p className="eyebrow mb-4">Shop</p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-mute transition hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-4">Policies</p>
            <ul className="space-y-2.5">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-mute transition hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-4">Contact</p>
            <ul className="space-y-2.5 text-sm text-mute">
              <li>
                <Link href="/contact" className="transition hover:text-ink">
                  Contact form
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="transition hover:text-ink">
                  Track an order
                </Link>
              </li>
            </ul>

            {socialEntries.length > 0 && (
              <div className="mt-6 flex gap-3">
                {socialEntries.map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs uppercase text-mute transition hover:text-mist"
                  >
                    {key}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="vapor-divider my-10" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-mono text-xs text-faint">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="font-mono text-xs text-faint">18+ · Not for sale to minors</p>
        </div>
      </div>
    </footer>
  );
}
