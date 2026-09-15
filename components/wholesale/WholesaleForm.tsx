"use client";

import { useState } from "react";
import { submitWholesaleInquiry } from "@/lib/actions/wholesale";

const VOLUME_OPTIONS = ["Under 50 units", "50–200 units", "200–1,000 units", "1,000+ units"];

export default function WholesaleForm() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [productsInterested, setProductsInterested] = useState("");
  const [volume, setVolume] = useState(VOLUME_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await submitWholesaleInquiry({
      businessName,
      contactName,
      email,
      phone,
      productsInterested,
      estimatedMonthlyVolume: volume,
      message,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-lg font-semibold">Inquiry received</p>
        <p className="mt-2 text-sm text-mute">
          Thanks — our wholesale team will reach out to {email} with pricing and minimums within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs text-mute">Business name *</label>
          <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-mute">Contact name *</label>
          <input required value={contactName} onChange={(e) => setContactName(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-mute">Email *</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-mute">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input w-full" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Products / categories you're interested in *</label>
        <input
          required
          placeholder="e.g. pod systems, disposables, e-liquids"
          value={productsInterested}
          onChange={(e) => setProductsInterested(e.target.value)}
          className="input w-full"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Estimated monthly volume</label>
        <select value={volume} onChange={(e) => setVolume(e.target.value)} className="input w-full">
          {VOLUME_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Anything else we should know?</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input w-full resize-none"
        />
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
        {submitting ? "Sending…" : "Request wholesale pricing"}
      </button>
    </form>
  );
}
