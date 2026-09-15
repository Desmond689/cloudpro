"use client";

import { useRef, useState } from "react";

export interface BtcPaymentValue {
  imageBase64?: string;
  imageMimeType?: string;
  previewUrl?: string;
}

export default function BtcPaymentEntry({
  value,
  onChange,
}: {
  value: BtcPaymentValue;
  onChange: (value: BtcPaymentValue) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Screenshot must be under 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // "data:<mime>;base64,<data>"
      const [, base64] = result.split(",");
      onChange({ imageBase64: base64, imageMimeType: file.type, previewUrl: result });
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    onChange({ imageBase64: undefined, imageMimeType: undefined, previewUrl: undefined });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="card mt-4 space-y-3 p-4">
      <p className="text-xs text-mute">
        After sending payment, upload a screenshot of the transaction (from your wallet or exchange). This is
        required — we can&apos;t create your order without proof of payment.
      </p>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Screenshot of your payment</label>
        {value.previewUrl ? (
          <div className="relative w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.previewUrl} alt="BTC payment screenshot" className="aspect-square w-32 rounded-lg object-cover" />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-void text-xs"
              aria-label="Remove screenshot"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary px-3 py-2 text-xs">
              Take photo / choose screenshot
            </button>
          </div>
        )}
        {/* capture="environment" opens the phone camera directly on mobile; users can still pick from gallery instead. */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        {error && <p className="mt-1 text-xs text-bad">{error}</p>}
      </div>
    </div>
  );
}
