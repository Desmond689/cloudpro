"use client";

import { useState } from "react";
import { startConversation } from "@/lib/actions/messages";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await startConversation(name, email, message);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="card p-6 text-center">
        <p className="font-display text-lg font-semibold">Message sent</p>
        <p className="mt-2 text-sm text-mute">
          Thanks — we'll reply to {email} soon. You can also use the chat bubble in the corner for a
          faster back-and-forth.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div>
        <label className="mb-1.5 block text-xs text-mute">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input w-full"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-mute">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input w-full"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-mute">Message</label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input w-full resize-none"
        />
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
