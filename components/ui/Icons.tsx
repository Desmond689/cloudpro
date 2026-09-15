// Minimal hand-rolled icon set so Phase 1 has zero extra dependencies.
// Swappable for lucide-react or similar later without touching call sites.

type IconProps = { className?: string };

export function Search({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export function ShoppingBag({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

export function Menu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function Close({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

export function Star({ className, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="m12 3 2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.7 7 8.5 4.1-.8 7-4.3 7-8.5V6l-7-2.5Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Truck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path d="M3 7h11v9H3z" strokeLinejoin="round" />
      <path d="M14 10h4l3 3v3h-7z" strokeLinejoin="round" />
      <circle cx="7.5" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </svg>
  );
}

export function Headset({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M19 19v.5A3.5 3.5 0 0 1 15.5 23H13" strokeLinecap="round" />
    </svg>
  );
}

export function PackageSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path d="M3.5 7.5 12 3l8.5 4.5-8.5 4.5-8.5-4.5Z" strokeLinejoin="round" />
      <path d="M3.5 7.5v9L12 21m0-8.5V21m8.5-13.5v5.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19" cy="17.5" r="2.6" />
      <path d="m22 20.5-1.6-1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Lock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Bitcoin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 8h4a2 2 0 0 1 0 4h-4m0 0h4.5a2 2 0 0 1 0 4h-4.5m0-8v8m0-8V6.5m0 9.5V17.5m3-9.5V6.5m0 9.5V17.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GiftCard({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10.5h19" strokeLinecap="round" />
      <path d="M12 6c-1-2-3-2.5-4-1.3-1 1.2.2 2.8 4 3.3 3.8-.5 5-2.1 4-3.3-1-1.2-3-.7-4 1.3Z" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
