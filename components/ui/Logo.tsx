// Cloudra's mark: a vapor trail resolving into a droplet — cool mist body,
// warm ember core (coil glow). Replaces the old stock "Rainbow E-Liquids"
// neon-sign JPG, which didn't say Cloudra anywhere and was the single
// biggest reason the site read as thrown-together.

type LogoProps = { className?: string };

export function LogoMark({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cloudra-mist" x1="4" y1="4" x2="36" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B6ECFA" />
          <stop offset="1" stopColor="#3FA8C2" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="#12161D" />
      <path
        d="M12 24.5c-2.5 0-4.5-2-4.5-4.5S9.5 15.5 12 15.5c.3 0 .6 0 .9.08C13.6 12.4 16.4 10 19.7 10c3.7 0 6.8 2.9 7.1 6.5 2.6.5 4.6 2.8 4.6 5.5 0 3.1-2.5 5.5-5.6 5.5H12Z"
        fill="url(#cloudra-mist)"
      />
      <circle cx="20" cy="30.5" r="2.6" fill="#FF6B3D" />
    </svg>
  );
}

export default function Logo({ className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        Cloudra
      </span>
    </span>
  );
}
