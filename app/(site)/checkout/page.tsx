"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/components/cart/CartContext";
import { createOrder } from "@/lib/actions/checkout";
import { reportCartIntent } from "@/lib/actions/ai-admin";
import { createClient } from "@/lib/supabase/client";
import GiftCardEntry, { type GiftCardValue } from "@/components/order/GiftCardEntry";
import BtcPaymentEntry, { type BtcPaymentValue } from "@/components/order/BtcPaymentEntry";
import CopyButton from "@/components/ui/CopyButton";
import type { DeliveryZone, PaymentMethod, StoreSettings } from "@/lib/types";

const SHIPPING_COST = 6.99;

export default function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const router = useRouter();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("giftcard");
  const [giftCard, setGiftCard] = useState<GiftCardValue>({ code: "", amount: "" });
  const [btcPayment, setBtcPayment] = useState<BtcPaymentValue>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("public_store_settings")
      .select("*")
      .single()
      .then(({ data }) => setSettings(data as StoreSettings));
    supabase
      .from("delivery_zones")
      .select("id, name, fee, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setZones((data as DeliveryZone[]) ?? []));
  }, []);

  const shippingCost = zoneId ? Number(zones.find((z) => z.id === zoneId)?.fee ?? SHIPPING_COST) : SHIPPING_COST;

  if (lines.length === 0) {
    return (
      <div className="container-px mx-auto max-w-7xl py-24 text-center">
        <p className="font-display text-2xl font-semibold">Nothing to check out</p>
        <p className="mt-2 text-sm text-mute">Your cart is empty.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const shipping = {
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      address: String(form.get("address") ?? ""),
      city: String(form.get("city") ?? ""),
      region: String(form.get("region") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      country: String(form.get("country") ?? ""),
    };

    if (method === "giftcard" && (!giftCard.code.trim() || !giftCard.amount)) {
      setSubmitting(false);
      setError("Please enter your gift card code and amount.");
      return;
    }

    if (method === "btc" && !btcPayment.imageBase64) {
      setSubmitting(false);
      setError("Please upload a screenshot of your payment before placing the order.");
      return;
    }

    // Track cart intent for abandoned-cart automation (non-blocking)
    try {
      await reportCartIntent({
        email: shipping.email,
        customerName: shipping.fullName,
        phone: shipping.phone,
        checkoutStarted: true,
        cartLines: lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          price: l.price,
          quantity: l.quantity,
          slug: l.slug,
        })),
      });
    } catch {
      // never block checkout
    }

    const result = await createOrder({
      shipping,
      paymentMethod: method,
      cartLines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      deliveryZoneId: zoneId || null,
      giftCard:
        method === "giftcard"
          ? {
              code: giftCard.code.trim(),
              amount: Number(giftCard.amount),
              imageBase64: giftCard.imageBase64,
              imageMimeType: giftCard.imageMimeType,
            }
          : undefined,
      btcPayment:
        method === "btc"
          ? {
              imageBase64: btcPayment.imageBase64!,
              imageMimeType: btcPayment.imageMimeType!,
            }
          : undefined,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    clear();
    router.push(`/order-confirmation/${result.orderId}`);
  }

  return (
    <div className="container-px mx-auto max-w-5xl py-10 sm:py-14">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Checkout</h1>
        <p className="mt-2 text-sm text-mute">No account needed — just fill in your details below.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-6">
          <section>
            <p className="eyebrow mb-3">Shipping details</p>
            <div className="grid grid-cols-2 gap-3">
              <input name="fullName" required placeholder="Full name" className="input col-span-2" />
              <input name="email" type="email" required placeholder="Email" className="input col-span-2" />
              <input name="phone" required placeholder="Phone" className="input col-span-2" />
              <input name="address" required placeholder="Address" className="input col-span-2" />
              <input name="city" required placeholder="City" className="input" />
              <input name="region" required placeholder="State / Region" className="input" />
              <input name="postalCode" required placeholder="Postal code" className="input" />
              <input name="country" required placeholder="Country" className="input" />
            </div>
          </section>

          {zones.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Delivery zone</p>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="input w-full"
              >
                <option value="">Standard shipping — ${SHIPPING_COST.toFixed(2)}</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — ${Number(z.fee).toFixed(2)}
                  </option>
                ))}
              </select>
            </section>
          )}

          <section>
            <p className="eyebrow mb-3">Payment method</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("giftcard")}
                className={`rounded-xl border p-4 text-left text-sm ${
                  method === "giftcard" ? "border-mist bg-mist/10" : "border-line"
                }`}
              >
                Gift card
              </button>
              <button
                type="button"
                onClick={() => setMethod("btc")}
                className={`rounded-xl border p-4 text-left text-sm ${
                  method === "btc" ? "border-mist bg-mist/10" : "border-line"
                }`}
              >
                Bitcoin (BTC)
              </button>
            </div>

            {method === "btc" && (
              <div className="card mt-4 p-4">
                {settings?.btc_address ? (
                  <>
                    <p className="mb-2 text-xs text-mute">Send the exact total to:</p>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 break-all rounded-lg bg-raised p-3 font-mono text-xs">{settings.btc_address}</p>
                      <CopyButton value={settings.btc_address} />
                    </div>
                    {settings.btc_qr_url && (
                      <div className="relative mx-auto mt-3 h-40 w-40">
                        <Image src={settings.btc_qr_url} alt="BTC payment QR code" fill className="object-contain" />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-mute">
                    BTC address hasn&apos;t been set up yet — place your order and we&apos;ll follow up with payment details.
                  </p>
                )}
              </div>
            )}
            {method === "btc" && <BtcPaymentEntry value={btcPayment} onChange={setBtcPayment} />}
            {method === "giftcard" && <GiftCardEntry value={giftCard} onChange={setGiftCard} />}
          </section>
        </div>

        <aside className="card h-fit p-5">
          <p className="eyebrow mb-4">Order summary</p>
          <div className="flex flex-col gap-2">
            {lines.map((l) => (
              <div key={l.productId} className="flex justify-between text-sm">
                <span className="text-mute">
                  {l.name} × {l.quantity}
                </span>
                <span className="font-mono">${(l.price * l.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="vapor-divider my-4" />
          <div className="flex justify-between text-sm text-mute">
            <span>Subtotal</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-mute">
            <span>Shipping</span>
            <span className="font-mono">${shippingCost.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between font-display text-base font-semibold">
            <span>Total</span>
            <span className="font-mono">${(subtotal + shippingCost).toFixed(2)}</span>
          </div>

          {error && <p className="mt-4 text-xs text-bad">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full">
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </aside>
      </form>
    </div>
  );
}
