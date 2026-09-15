"use client";

import { useRef } from "react";

/**
 * Lightweight cursor-following 3D tilt, the same pattern as the homepage
 * hero (HeroTilt) but reusable for product cards, category tiles, etc.
 * Pure CSS transform driven by pointer position — no library, no layout
 * shift, and it no-ops on touch devices (no pointermove without a cursor).
 */
export default function TiltCard({
  children,
  className = "",
  strength = 8,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${px * strength}deg) rotateX(${py * -strength}deg) translateZ(0)`;
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "rotateY(0deg) rotateX(0deg) translateZ(0)";
  }

  return (
    <div style={{ perspective: "900px" }} className={className}>
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="h-full transition-transform duration-300 ease-out [transform-style:preserve-3d]"
      >
        {children}
      </div>
    </div>
  );
}
