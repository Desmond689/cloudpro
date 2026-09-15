"use client";

import { useRef, useState } from "react";

export interface GiftCardValue {
  code: string;
  amount: string;
  imageBase64?: string;
  imageMimeType?: string;
  previewUrl?: string;
}

export default function GiftCardEntry({
  value,
  onChange,
}: {
  value: GiftCardValue;
  onChange: (value: GiftCardValue) => void;
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
      setError("Photo must be under 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // "data:<mime>;base64,<data>"
      const [, base64] = result.split(",");
      onChange({ ...value, imageBase64: base64, imageMimeType: file.type, previewUrl: result });
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    onChange({ ...value, imageBase64: undefined, imageMimeType: undefined, previewUrl: undefined });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="card mt-4 space-y-3 p-4">
      <p className="text-xs text-mute">
        Enter your gift card details below. A photo of the card helps us verify it faster, but isn&apos;t required.
      </p>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Gift card code</label>
        <input
          required
          value={value.code}
          onChange={(e) => onChange({ ...value, code: e.target.value })}
          placeholder="Enter the code printed on the card"
          className="input w-full"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Gift card amount ($)</label>
        <input
          required
          type="number"
          step="0.01"
          min="0.01"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
          placeholder="0.00"
          className="input w-full"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-mute">Photo of the gift card (optional)</label>
        {value.previewUrl ? (
          <div className="relative w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.previewUrl} alt="Gift card photo" className="aspect-square w-32 rounded-lg object-cover" />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-void text-xs"
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary px-3 py-2 text-xs">
              Take photo / choose image
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
