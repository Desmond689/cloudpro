"use client";

import { HANDOFF_PAYMENT_LABELS, type HandoffPaymentMethod } from "@/lib/whatsapp";

const METHODS: { id: HandoffPaymentMethod; glyph: string; tint: string }[] = [
  { id: "cashapp", glyph: "$", tint: "text-ok" },
  { id: "venmo", glyph: "V", tint: "text-mist" },
  { id: "chime", glyph: "C", tint: "text-ok" },
  { id: "zelle", glyph: "Z", tint: "text-mist-soft" },
  { id: "applepay", glyph: "", tint: "text-ink" },
];

export default function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: HandoffPaymentMethod | null;
  onChange: (m: HandoffPaymentMethod) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {METHODS.map((m) => {
          const active = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              aria-pressed={active}
              className={`group flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                active
                  ? "border-mist bg-mist/10 shadow-mist"
                  : "border-line bg-raised/50 hover:border-mist/40 hover:bg-raised"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-void font-display text-sm font-bold ${m.tint}`}
              >
                {m.glyph}
              </span>
              <span className="flex-1 text-sm font-medium text-ink">{HANDOFF_PAYMENT_LABELS[m.id]}</span>
              <span
                className={`h-4 w-4 rounded-full border transition ${
                  active ? "border-mist bg-mist" : "border-line group-hover:border-mist/50"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
        <p className="text-xs font-medium text-warn">Payment is arranged on WhatsApp</p>
        <p className="mt-1.5 text-xs text-mute">
          Placing this order does not charge you. We&apos;ll send payment details on WhatsApp, and your order is
          confirmed once payment clears. Send money only to the account we give you there — never to anyone else
          claiming to be us.
        </p>
      </div>
    </div>
  );
}
