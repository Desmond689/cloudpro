"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleProductPublished } from "@/lib/actions/admin";

export default function PublishToggleButton({
  productId,
  isPublished,
}: {
  productId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [published, setPublished] = useState(isPublished);
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    // This button lives inside a <Link> card — stop the click from also
    // navigating into the product's edit page.
    e.preventDefault();
    e.stopPropagation();

    const next = !published;
    startTransition(async () => {
      const result = await toggleProductPublished(productId, next);
      if (result.ok) {
        setPublished(next);
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={`rounded-full px-2 py-0.5 text-xs transition disabled:opacity-60 ${
        published ? "bg-mist/15 text-mist" : "bg-raised text-faint"
      }`}
    >
      {published ? "Published" : "Draft"}
    </button>
  );
}
