import Link from "next/link";
import HeroTilt from "@/components/home/HeroTilt";
import { ShieldCheck, Truck } from "@/components/ui/Icons";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Drifting mist blobs — the page's one signature ambient motion */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-0 h-72 w-72 animate-drift-slow rounded-full bg-mist/20 blur-[90px]" />
        <div className="absolute right-0 top-24 h-80 w-80 animate-drift rounded-full bg-ember/10 blur-[100px]" />
      </div>

      <div className="container-px mx-auto grid max-w-7xl items-center gap-14 py-16 sm:py-24 lg:grid-cols-2 lg:gap-10">
        <div className="max-w-2xl animate-fade-up">
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Cleaner clouds,
            <br />
            <span className="text-mist">curated gear.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-mute sm:text-lg">
            Devices, e-liquids, and accessories, checked by hand before they're
            listed. Every order ships same day with real tracking, not a
            promise.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">
              Shop now
            </Link>
            <Link href="/track-order" className="btn-secondary">
              Track an order
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-2 text-sm text-mute">
            <ShieldCheck className="h-4 w-4 text-mist" />
            <span>21+ verified checkout · encrypted payment · discreet packaging</span>
          </div>
        </div>

        <div className="relative animate-fade-up">
          <HeroTilt>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <img
                src="/hero-banner.jpg"
                alt="Featured vape devices"
                className="w-full rounded-2xl border border-line/60 shadow-mist"
              />

              {/* Floating proof — describes real practices, not fabricated stats */}
              <div className="proof-badge absolute -left-4 top-6 hidden sm:flex lg:-left-8">
                <ShieldCheck className="h-4 w-4 text-mist" />
                <div className="leading-tight">
                  <p className="text-sm font-medium text-ink">Hand-checked</p>
                  <p className="text-xs text-mute">before it's listed</p>
                </div>
              </div>

              <div className="proof-badge absolute -bottom-5 right-4 hidden sm:flex lg:right-8">
                <Truck className="h-4 w-4 text-ok" />
                <div className="leading-tight">
                  <p className="text-sm font-medium text-ink">Ships same day</p>
                  <p className="text-xs text-mute">real tracking, not a promise</p>
                </div>
              </div>
            </div>
          </HeroTilt>
        </div>
      </div>
    </section>
  );
}
