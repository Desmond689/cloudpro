import Link from "next/link";
import { PackageSearch } from "@/components/ui/Icons";

export default function WholesaleBanner() {
  return (
    <section className="container-px mx-auto max-w-7xl py-4">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-raised/60 px-6 py-8 sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 animate-drift-slow rounded-full bg-ember/20 blur-[80px]" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 animate-drift rounded-full bg-mist/20 blur-[70px]" />

        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
              <PackageSearch className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold sm:text-xl">Run a shop? Get wholesale pricing.</h3>
              <p className="mt-1 max-w-md text-sm text-mute">
                Tiered pricing, case-pack freight, and a real account contact for resellers and retailers.
              </p>
            </div>
          </div>
          <Link href="/wholesale" className="btn-primary shrink-0">
            Request pricing →
          </Link>
        </div>
      </div>
    </section>
  );
}
