import type { WholesaleTier } from "@/lib/types";

/**
 * "Buy more, pay less" bulk pricing table shown on the product page when
 * the admin has set wholesale_tiers. Separate from the /wholesale inquiry
 * form — this is self-serve pricing right on the page, no quote needed.
 */
export default function WholesaleTierTable({ basePrice, tiers }: { basePrice: number; tiers: WholesaleTier[] }) {
  if (!tiers || tiers.length === 0) return null;

  const rows = [{ minQty: 1, price: basePrice }, ...tiers];

  return (
    <div className="card-3d mt-6 overflow-hidden">
      <p className="border-b border-line bg-raised/60 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-mist">
        Buy more, pay less
      </p>
      <div className="divide-y divide-line">
        {rows.map((row, i) => {
          const isBase = i === 0;
          const savingsPct = isBase ? 0 : Math.round((1 - row.price / basePrice) * 100);
          return (
            <div key={row.minQty} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-mute">{isBase ? "1" : `${row.minQty}+`} units</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-ink">${row.price.toFixed(2)}</span>
                {savingsPct > 0 && (
                  <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-medium text-ok">
                    Save {savingsPct}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
