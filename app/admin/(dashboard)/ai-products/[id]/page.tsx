import { notFound } from "next/navigation";
import Link from "next/link";
import { getAiProductDraft } from "@/lib/actions/ai-products";
import AiProductDraftEditor from "@/components/admin/AiProductDraftEditor";

export default async function AiProductDraftPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await getAiProductDraft(params.id);
  if (!result.ok) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/admin/ai-products" className="text-xs text-mute hover:text-ink">
          ← Product Studio
        </Link>
        <h1 className="mt-2 font-display text-xl font-semibold">
          Edit AI product draft
        </h1>
        <p className="text-xs text-mute">
          Status: <span className="text-ink">{result.draft.status}</span>
          {result.draft.factual_gaps && (
            <span className="ml-2 text-ember">· Fill factual gaps before publishing</span>
          )}
        </p>
      </div>
      <AiProductDraftEditor draft={result.draft} categories={result.categories} />
    </div>
  );
}
