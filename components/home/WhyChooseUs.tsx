import { ShieldCheck, PackageSearch, Headset, Lock } from "@/components/ui/Icons";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Checked before listing",
    blurb: "Every device is tested and every batch verified before it goes up for sale.",
  },
  {
    icon: Lock,
    title: "Secure checkout",
    blurb: "Payments are encrypted end-to-end — your details are never stored on our servers.",
  },
  {
    icon: Headset,
    title: "Real support",
    blurb: "Message us and a person replies — no ticket queue, no chatbot loop.",
  },
  {
    icon: PackageSearch,
    title: "Order tracking",
    blurb: "Every order gets a real tracking ID you can check anytime, no account needed.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="container-px mx-auto max-w-7xl py-16 sm:py-20">
      <h2 className="mb-10 max-w-lg font-display text-2xl font-semibold sm:text-3xl">
        Built for people who've been burned by a shady vape site before
      </h2>

      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <div key={b.title} className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-mist/25 bg-mist/10 text-mist">
              <b.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-medium">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mute">{b.blurb}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
