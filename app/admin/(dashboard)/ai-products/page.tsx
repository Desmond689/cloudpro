import Link from "next/link";
import { getProductStudioData } from "@/lib/actions/ai-products";
import AiProductStudioClient from "@/components/admin/AiProductStudioClient";

export default async function AiProductStudioPage() {
  const data = await getProductStudioData();
  if (!data.ok) {
    return <p className="text-sm text-bad">Not authorized.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">AI</p>
          <h1 className="font-display text-xl font-semibold">Product Studio</h1>
          <p className="mt-1 text-sm text-mute">
            Generate vape product drafts only (devices, e-liquids, pods, disposables, accessories). Nothing goes live until you approve and publish.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-raised px-4 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-mute">Today&apos;s drafts</p>
          <p className="font-display text-lg font-semibold text-ink">
            {data.usedToday}/{data.maxPerDay}
          </p>
          <p className="text-[11px] text-mute">{data.remainingToday} remaining</p>
        </div>
      </div>

      <AiProductStudioClient
        usedToday={data.usedToday}
        maxPerDay={data.maxPerDay}
        remainingToday={data.remainingToday}
        drafts={data.drafts}
        categories={data.categories}
      />

      <p className="text-xs text-mute">
        Published drafts become real products under{" "}
        <Link href="/admin/products" className="underline hover:text-ink">
          Products
        </Link>
        . You can still edit images, stock, and publish toggle there.
      </p>
    </div>
  );
}
