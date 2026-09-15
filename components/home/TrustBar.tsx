import { Lock, Truck, Headset, Bitcoin, GiftCard } from "@/components/ui/Icons";

const GUARANTEES = [
  { icon: Lock, label: "Encrypted checkout" },
  { icon: Truck, label: "Same-day dispatch" },
  { icon: Headset, label: "Real replies, not a bot" },
];

export default function TrustBar() {
  return (
    <div className="border-y border-line/60 bg-surface/40">
      <div className="container-px mx-auto flex max-w-7xl flex-col items-center gap-4 py-5 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap justify-center gap-3">
          {GUARANTEES.map(({ icon: Icon, label }) => (
            <span key={label} className="trust-chip">
              <Icon className="h-3.5 w-3.5 text-mist" />
              {label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-faint">Pay with</span>
          <span className="trust-chip">
            <Bitcoin className="h-3.5 w-3.5 text-ember" />
            Bitcoin
          </span>
          <span className="trust-chip">
            <GiftCard className="h-3.5 w-3.5 text-ember" />
            Gift card
          </span>
        </div>
      </div>
    </div>
  );
}
