"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, Close } from "@/components/ui/Icons";

export default function AdminMobileNav({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal target (document.body) only exists on the client, so wait for mount.
  useEffect(() => setMounted(true), []);

  return (
    <>
      <button aria-label="Open admin menu" onClick={() => setOpen(true)} className="text-ink lg:hidden">
        <Menu className="h-6 w-6" />
      </button>

      {mounted && open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Close menu"
              className="absolute inset-0 bg-void/90 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-surface p-4 pb-8 animate-fade-up">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
              <nav className="grid grid-cols-2 gap-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-raised px-4 py-3 text-center text-sm text-ink"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-mute"
              >
                <Close className="h-4 w-4" /> Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
