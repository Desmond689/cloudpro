"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";
import { Menu, Close } from "@/components/ui/Icons";

export default function MobileNav({ socialEntries = [] }: { socialEntries?: [string, string][] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasSocials = socialEntries.length > 0;

  // Portal target (document.body) only exists on the client, so wait for mount.
  useEffect(() => setMounted(true), []);

  return (
    <>
      <button aria-label="Open menu" onClick={() => setOpen(true)} className="text-ink">
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
            {/* Sheet is anchored bottom-right leaning — reachable one-handed */}
            <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col border-l border-line bg-raised p-6 shadow-2xl animate-fade-up">
              <div className="mb-8 flex items-center justify-between">
                <span className="font-display text-base font-semibold">Menu</span>
                <button
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-surface p-1.5 text-ink"
                >
                  <Close className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-transparent px-3 py-3 text-base text-ink transition hover:border-line hover:bg-surface active:bg-surface"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-transparent px-3 py-3 text-base text-ink transition hover:border-line hover:bg-surface active:bg-surface"
                >
                  Account
                </Link>
              </nav>

              <div className="mt-auto pt-8">
                <div className="vapor-divider mb-6" />
                {hasSocials ? (
                  <>
                    <p className="eyebrow mb-3">Follow Cloudra</p>
                    <div className="flex flex-wrap gap-3">
                      {socialEntries.map(([key, url]) => (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs uppercase text-mute transition hover:text-mist"
                        >
                          {key}
                        </a>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="font-mono text-xs text-faint">Social links coming soon</p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
