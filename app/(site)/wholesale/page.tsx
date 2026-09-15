import type { Metadata } from "next";
import WholesaleForm from "@/components/wholesale/WholesaleForm";
import { SITE } from "@/lib/constants";
import { Truck, ShieldCheck, Headset } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: `Wholesale — ${SITE.name}`,
  description: "Bulk pricing for shops and resellers. Tell us what you're stocking and we'll send a quote.",
};

const PERKS = [
  { icon: ShieldCheck, title: "Verified inventory", body: "Every SKU we offer wholesale is the same hand-checked stock sold at retail." },
  { icon: Truck, title: "Case & pallet freight", body: "Bulk orders ship freight or case-pack, with tracking on every shipment." },
  { icon: Headset, title: "A real account contact", body: "One person on our team owns your account — no support queue." },
];

export default function WholesalePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-0 h-72 w-72 animate-drift-slow rounded-full bg-mist/15 blur-[100px]" />
        <div className="absolute right-0 top-40 h-80 w-80 animate-drift rounded-full bg-ember/10 blur-[110px]" />
      </div>

      <div className="container-px mx-auto max-w-6xl py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-3">Wholesale & bulk orders</p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Stock {SITE.name} in your shop</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-mute sm:text-base">
            Tell us what you need and how much — we'll send back tiered pricing, minimum order quantities, and lead
            times for your account.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div className="space-y-4">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist/10 text-mist">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-medium text-ink">{title}</p>
                  <p className="mt-1 text-sm text-mute">{body}</p>
                </div>
              </div>
            ))}
            <div className="card p-5">
              <p className="font-display text-sm font-medium text-ink">Already have an account?</p>
              <p className="mt-1 text-sm text-mute">
                Reply to any invoice email or message us via the chat bubble — your account contact will pick it up
                directly.
              </p>
            </div>
          </div>

          <WholesaleForm />
        </div>
      </div>
    </div>
  );
}
