import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Contact — ${SITE.name}`,
  description: "Get in touch with the Cloudra team — orders, products, or anything else.",
};

export default function ContactPage() {
  return (
    <div className="container-px mx-auto max-w-5xl py-14 sm:py-20">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-3">Get in touch</p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Contact us</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-mute">
          Questions about an order, a product, or anything else — send a message and we'll get back to
          you. For a faster reply, use the chat bubble in the corner instead.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <div className="card p-5">
            <p className="eyebrow mb-2">Order questions</p>
            <p className="text-sm text-mute">
              Already placed an order? Check its status on the{" "}
              <a href="/track-order" className="text-mist">
                Track Order
              </a>{" "}
              page — it's usually faster than waiting on a reply here.
            </p>
          </div>
          <div className="card p-5">
            <p className="eyebrow mb-2">Response time</p>
            <p className="text-sm text-mute">
              We typically reply within 24 hours. Messages sent here go straight to our support inbox.
            </p>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
