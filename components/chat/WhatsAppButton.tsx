"use client";

import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Floating WhatsApp button, stacked above the chat launcher.
 * Opens the business line in WhatsApp with a neutral prefilled greeting.
 */
export default function WhatsAppButton() {
  return (
    <a
      href={buildSupportWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message us on WhatsApp"
      className="group fixed bottom-[5.75rem] right-4 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] py-3 pl-3.5 pr-4 font-display text-sm font-semibold text-[#06281A] shadow-[0_10px_30px_-8px_rgba(37,211,102,0.55)] transition hover:scale-[1.03] active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23a8.18 8.18 0 0 1 5.82 2.42 8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24z" />
      </svg>
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
