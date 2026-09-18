"use client";

import { useTransition } from "react";
import { updateWholesaleInquiryStatus } from "@/lib/actions/admin";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import type { WholesaleInquiry } from "@/lib/types";

const STATUS_COLOR: Record<WholesaleInquiry["status"], string> = {
  new: "text-warn",
  contacted: "text-mist",
  closed: "text-mute",
};

/**
 * Builds the WhatsApp deep-link the admin uses to reply to a wholesale
 * lead — prefilled so the admin doesn't retype the inquiry back to them.
 * Only opens the admin's own WhatsApp compose window; nothing is sent
 * automatically and no customer data leaves this page until the admin
 * hits send themselves.
 */
function buildReplyMessage(inquiry: WholesaleInquiry) {
  return [
    `Hi ${inquiry.contact_name}, thanks for your wholesale inquiry for ${inquiry.business_name}!`,
    `You mentioned interest in: ${inquiry.products_interested}.`,
    inquiry.estimated_monthly_volume ? `Estimated volume: ${inquiry.estimated_monthly_volume}.` : null,
    "Here's our wholesale pricing — let me know if you'd like to move forward:",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function WholesaleInquiryRow({ inquiry }: { inquiry: WholesaleInquiry }) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: WholesaleInquiry["status"]) {
    startTransition(() => updateWholesaleInquiryStatus(inquiry.id, status));
  }

  return (
    <div className="card-3d p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-semibold text-ink">{inquiry.business_name}</p>
          <p className="text-xs text-mute">
            {inquiry.contact_name} · {inquiry.email}
            {inquiry.phone ? ` · ${inquiry.phone}` : ""}
          </p>
        </div>
        <span className={`text-xs font-medium capitalize ${STATUS_COLOR[inquiry.status]}`}>{inquiry.status}</span>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <p>
          <span className="text-mute">Interested in: </span>
          {inquiry.products_interested}
        </p>
        {inquiry.estimated_monthly_volume && (
          <p>
            <span className="text-mute">Est. volume: </span>
            {inquiry.estimated_monthly_volume}
          </p>
        )}
        {inquiry.message && (
          <p className="rounded-lg bg-raised p-3 text-xs text-mute">{inquiry.message}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={buildSupportWhatsAppUrl(buildReplyMessage(inquiry))}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-[#06281A] transition hover:brightness-95"
        >
          Reply on WhatsApp
        </a>
        <a href={`mailto:${inquiry.email}`} className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-mist/40">
          Email
        </a>

        <div className="ml-auto flex gap-1.5">
          {(["new", "contacted", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending || inquiry.status === s}
              onClick={() => setStatus(s)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] capitalize transition disabled:opacity-40 ${
                inquiry.status === s ? "border-mist bg-mist/10 text-mist" : "border-line text-mute hover:border-mist/30"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
