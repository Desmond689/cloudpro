"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStoreSettings, updateTelegramSettings, uploadBtcQr } from "@/lib/actions/admin";
import type { StoreSettings } from "@/lib/types";

export default function StoreSettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [telegramPending, startTelegramTransition] = useTransition();
  const [qrPending, startQrTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateStoreSettings(formData);
      setMessage(result.ok ? "Saved." : result.error);
      router.refresh();
    });
  }

  function handleTelegramSubmit(formData: FormData) {
    setTelegramMessage(null);
    startTelegramTransition(async () => {
      const result = await updateTelegramSettings(formData);
      setTelegramMessage(result.ok ? "Saved." : result.error);
      router.refresh();
    });
  }

  function handleQrSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrError(null);
    const formData = new FormData();
    formData.set("file", file);
    startQrTransition(async () => {
      const result = await uploadBtcQr(formData);
      if (!result.ok) setQrError(result.error);
      else router.refresh();
      if (qrInputRef.current) qrInputRef.current.value = "";
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="mb-3 font-display text-sm font-medium">BTC payment QR</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-raised">
            {settings.btc_qr_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.btc_qr_url} alt="BTC QR" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-faint">No QR yet</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => qrInputRef.current?.click()}
            disabled={qrPending}
            className="btn-secondary text-xs disabled:opacity-60"
          >
            {qrPending ? "Uploading…" : "Upload QR image"}
          </button>
          <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrSelected} className="hidden" />
        </div>
        {qrError && <p className="mt-2 text-xs text-bad">{qrError}</p>}
      </div>

      <form action={handleSubmit} className="card space-y-4 p-5">
        <h2 className="font-display text-sm font-medium">Payment & socials</h2>

        <div>
          <label className="mb-1.5 block text-xs text-mute">BTC address</label>
          <input
            name="btc_address"
            defaultValue={settings.btc_address ?? ""}
            placeholder="Not set yet"
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 font-mono text-xs focus:border-mist/50"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="age_verification_enabled"
            defaultChecked={settings.age_verification_enabled ?? true}
          />
          Require age verification on the site
        </label>

        <div className="vapor-divider" />

        {[
          ["social_instagram", "Instagram URL"],
          ["social_tiktok", "TikTok URL"],
          ["social_youtube", "YouTube URL"],
          ["social_facebook", "Facebook URL"],
          ["social_x", "X / Twitter URL"],
          ["social_whatsapp", "WhatsApp link"],
        ].map(([name, label]) => (
          <div key={name}>
            <label className="mb-1.5 block text-xs text-mute">{label}</label>
            <input
              name={name}
              defaultValue={(settings as any)[name] ?? ""}
              placeholder="https://…"
              className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
            />
          </div>
        ))}

        {message && <p className="text-sm text-mute">{message}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
          {pending ? "Saving…" : "Save settings"}
        </button>
      </form>

      <form action={handleTelegramSubmit} className="card space-y-4 p-5">
        <div>
          <h2 className="font-display text-sm font-medium">Telegram alerts</h2>
          <p className="mt-1 text-xs text-faint">
            The bot token stays in your server's environment variables. Everything below is safe to
            change here without a redeploy.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="telegram_notify_new_order"
            defaultChecked={settings.telegram_notify_new_order ?? true}
          />
          Notify me on new orders
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="telegram_notify_low_stock"
            defaultChecked={settings.telegram_notify_low_stock ?? false}
          />
          Notify me on low stock
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="telegram_notify_new_message"
            defaultChecked={settings.telegram_notify_new_message ?? false}
          />
          Notify me on new support messages
        </label>

        <div>
          <label className="mb-1.5 block text-xs text-mute">
            Chat ID override <span className="text-faint">(optional — uses TELEGRAM_CHAT_ID env var if blank)</span>
          </label>
          <input
            name="telegram_chat_id_override"
            defaultValue={settings.telegram_chat_id_override ?? ""}
            placeholder="Leave blank to use the default"
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 font-mono text-xs focus:border-mist/50"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-mute">
            New-order message template <span className="text-faint">(optional — leave blank for the default)</span>
          </label>
          <textarea
            name="telegram_message_template"
            defaultValue={settings.telegram_message_template ?? ""}
            rows={6}
            placeholder={"🛒 New order {order_number}\n\nCustomer: {customer_name}\nTotal: ${total}"}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 font-mono text-xs focus:border-mist/50"
          />
          <p className="mt-1.5 text-xs text-faint">
            Placeholders: {"{order_number} {customer_name} {phone} {email} {address} {items} {total} {payment_method} {date}"}
          </p>
        </div>

        {telegramMessage && <p className="text-sm text-mute">{telegramMessage}</p>}

        <button type="submit" disabled={telegramPending} className="btn-primary w-full disabled:opacity-60">
          {telegramPending ? "Saving…" : "Save Telegram settings"}
        </button>
      </form>
    </div>
  );
}
