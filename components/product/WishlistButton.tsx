"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlist } from "@/lib/actions/account";

export default function WishlistButton({
  productId,
  initialWishlisted,
}: {
  productId: string;
  initialWishlisted: boolean;
}) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await toggleWishlist(productId);
      if (!result.ok) {
        if (!result.signedIn) router.push("/account/login");
        return;
      }
      setWishlisted(result.wishlisted);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm text-mute transition hover:text-ink disabled:opacity-60"
      aria-pressed={wishlisted}
    >
      <span aria-hidden>{wishlisted ? "♥" : "♡"}</span>
      {wishlisted ? "Saved to wishlist" : "Add to wishlist"}
    </button>
  );
}
