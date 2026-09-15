"use client";

import { useEffect, useState } from "react";
import { getBtcScreenshotUrl } from "@/lib/actions/admin";

export default function BtcScreenshotImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBtcScreenshotUrl(path).then((result) => {
      if (cancelled) return;
      if (result.ok) setUrl(result.url);
      else setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error) return <p className="mt-3 text-xs text-bad">Could not load the payment screenshot.</p>;
  if (!url) return <p className="mt-3 text-xs text-mute">Loading screenshot…</p>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="BTC payment screenshot submitted by customer" className="mt-3 max-h-64 rounded-xl border border-line object-contain" />
  );
}
