"use client";

import { useEffect, useState } from "react";
import { getGiftCardImageUrl } from "@/lib/actions/admin";

export default function GiftCardImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGiftCardImageUrl(path).then((result) => {
      if (cancelled) return;
      if (result.ok) setUrl(result.url);
      else setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error) return <p className="mt-3 text-xs text-bad">Could not load the gift card photo.</p>;
  if (!url) return <p className="mt-3 text-xs text-mute">Loading photo…</p>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Gift card submitted by customer" className="mt-3 max-h-64 rounded-xl border border-line object-contain" />
  );
}
