import Link from "next/link";
import type { ComponentType } from "react";
import { ChevronRight } from "@/components/ui/Icons";

function DeviceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="8" y="2.5" width="8" height="19" rx="2.5" />
      <path d="M10.5 6.5h3" strokeLinecap="round" />
    </svg>
  );
}
function DropletIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3s6.5 7.1 6.5 11.5a6.5 6.5 0 1 1-13 0C5.5 10.1 12 3 12 3Z" strokeLinejoin="round" />
    </svg>
  );
}
function CoilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path d="M5 12c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5Z" />
      <path d="M14 12c0-3 2-5 5-5" strokeLinecap="round" />
    </svg>
  );
}
function CaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="8" width="18" height="12" rx="2.5" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}

const CATEGORIES: { name: string; blurb: string; icon: ComponentType<{ className?: string }> }[] = [
  { name: "Devices", blurb: "Pods, mods & kits", icon: DeviceIcon },
  { name: "E-Liquids", blurb: "Nic salts & freebase", icon: DropletIcon },
  { name: "Coils & Pods", blurb: "Replacements", icon: CoilIcon },
  { name: "Accessories", blurb: "Cases, chargers & more", icon: CaseIcon },
];

export default function Categories() {
  return (
    <section id="categories" className="container-px mx-auto max-w-7xl py-16 sm:py-20">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Shop by category</h2>
        <Link href="/shop" className="hidden items-center gap-0.5 text-sm text-mist hover:underline sm:flex">
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.name}
            href={`/shop?category=${cat.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            className="card group relative flex aspect-[4/3] flex-col justify-between overflow-hidden p-5"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-mist/10 blur-2xl transition group-hover:bg-mist/20" />
            <cat.icon className="h-6 w-6 text-mist" />
            <div>
              <h3 className="font-display text-base font-medium">{cat.name}</h3>
              <p className="mt-1 text-xs text-mute">{cat.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
