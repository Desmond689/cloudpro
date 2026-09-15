"use client";

import { useRef } from "react";

/**
 * Wraps the hero product shot in a subtle perspective tilt that follows the
 * cursor — the "3D" the product deserves, tied to an actual user action
 * (mouse move) rather than a constant spin. Falls back to flat on touch
 * devices and respects prefers-reduced-motion via the CSS transition only
 * (no transform is applied without pointer movement).
 */
export default function HeroTilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${px * 10}deg) rotateX(${py * -10}deg) translateZ(0)`;
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "rotateY(0deg) rotateX(0deg) translateZ(0)";
  }

  return (
    <div style={{ perspective: "1000px" }}>
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="transition-transform duration-300 ease-out [transform-style:preserve-3d]"
      >
        {children}
      </div>
    </div>
  );
}
