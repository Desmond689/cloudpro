import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `About — ${SITE.name}`,
  description: SITE.description,
};

const VALUES = [
  {
    title: "Curated, not crowded",
    body: "Every device and e-liquid on the shelf is picked for build quality and consistency — we'd rather stock fewer things well than everything at once.",
  },
  {
    title: "Shipped fast",
    body: "Orders are packed quickly and tracked from checkout to delivery, with real order-tracking instead of a black box.",
  },
  {
    title: "Real support",
    body: "Questions get answered by a person, not a script — reach us through live chat or the contact page any time.",
  },
];

export default function AboutPage() {
  return (
    <div className="container-px mx-auto max-w-4xl py-14 sm:py-20">
      <div className="text-center">
        <p className="eyebrow mb-3">Our story</p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">About {SITE.name}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-mute">{SITE.description}</p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.title} className="card p-5">
            <p className="font-display text-sm font-medium">{v.title}</p>
            <p className="mt-2 text-sm text-mute">{v.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 card p-6 text-center sm:p-10">
        <p className="font-display text-xl font-semibold">Ready to browse?</p>
        <p className="mt-2 text-sm text-mute">
          Devices, e-liquids, and accessories — all in one place.
        </p>
        <Link href="/shop" className="btn-primary mt-5 inline-flex">
          Shop now
        </Link>
      </div>
    </div>
  );
}
