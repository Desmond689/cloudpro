import { WHATSAPP_NUMBER } from "@/lib/constants";

export type HandoffPaymentMethod = "cashapp" | "venmo" | "chime" | "zelle" | "applepay";

export const HANDOFF_PAYMENT_LABELS: Record<HandoffPaymentMethod, string> = {
  cashapp: "Cash App",
  venmo: "Venmo",
  chime: "Chime",
  zelle: "Zelle",
  applepay: "Apple Pay",
};

export interface OrderHandoffDetails {
  orderId: string;
  products: { name: string; flavor?: string | null; quantity: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: HandoffPaymentMethod;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

/**
 * Builds the plain-text order message the customer sends us on WhatsApp.
 * The customer sends it themselves from their own WhatsApp — we never
 * message them first, and no payment credentials pass through the site.
 */
export function buildOrderMessage(d: OrderHandoffDetails): string {
  const productLines = d.products
    .map((p) => {
      const flavor = p.flavor ? ` (${p.flavor})` : "";
      return `• ${p.name}${flavor} × ${p.quantity} — ${money(p.lineTotal)}`;
    })
    .join("\n");

  return [
    "Hello! I would like to place an order from your store.",
    "",
    "🛒 ORDER DETAILS",
    `Order ID: #${d.orderId}`,
    "Products:",
    productLines,
    `Subtotal: ${money(d.subtotal)}`,
    `Delivery: ${money(d.deliveryFee)}`,
    `Total: ${money(d.total)}`,
    "",
    "💳 Selected Payment Method:",
    HANDOFF_PAYMENT_LABELS[d.paymentMethod],
    "",
    "👤 CUSTOMER DETAILS",
    `Name: ${d.customerName}`,
    `Phone: ${d.customerPhone}`,
    "",
    "📍 Delivery Address:",
    d.customerAddress,
    "",
    "Please send me the payment instructions/details for the selected payment method so I can complete the payment.",
    "",
    "Thank you!",
  ].join("\n");
}

export function buildOrderWhatsAppUrl(d: OrderHandoffDetails): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildOrderMessage(d))}`;
}

/** Generic "talk to us" link for the floating button — no order attached. */
export function buildSupportWhatsAppUrl(prefill?: string): string {
  const text = prefill ?? "Hi! I have a question about an order.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export interface WholesaleHandoffDetails {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  productsInterested: string;
  estimatedMonthlyVolume?: string;
}

/**
 * Lets a wholesale lead follow up on WhatsApp immediately after submitting
 * the form, instead of waiting on email/Telegram alone. This is a
 * customer-initiated wa.me link (same mechanism as the checkout handoff) —
 * true server-pushed WhatsApp messages require a Meta Business API
 * integration this project doesn't have configured.
 */
export function buildWholesaleWhatsAppUrl(d: WholesaleHandoffDetails): string {
  const text = [
    "Hello! I just submitted a wholesale inquiry on your site.",
    "",
    `Business: ${d.businessName}`,
    `Contact: ${d.contactName}`,
    `Email: ${d.email}`,
    d.phone ? `Phone: ${d.phone}` : null,
    `Interested in: ${d.productsInterested}`,
    d.estimatedMonthlyVolume ? `Estimated monthly volume: ${d.estimatedMonthlyVolume}` : null,
    "",
    "Could you send me wholesale pricing and minimum order quantities?",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
