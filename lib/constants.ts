// Central site configuration.
// In later phases, the values marked "admin-editable" will be moved into
// Supabase tables and managed from /admin — these local defaults are only
// placeholders so the UI has something to render in Phase 1.

export const SITE = {
  name: "Cloudra",
  tagline: "Cleaner clouds. Curated gear.",
  description:
    "Cloudra is a curated vape shop — devices, e-liquids, and accessories, picked for quality and shipped fast.",
};

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/shop#categories" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Track Order", href: "/track-order" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

// admin-editable in Phase 8 — BTC address + QR code are set from the
// admin dashboard and stored server-side, never hardcoded in the repo.
export const PAYMENT_METHODS_PLACEHOLDER = ["giftcard", "btc"] as const;
