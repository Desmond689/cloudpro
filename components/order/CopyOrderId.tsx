"use client";

import { useState } from "react";

export default function CopyOrderId({ orderNumber }: { orderNumber: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button onClick={handleCopy} className="text-xs text-mist hover:underline">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
