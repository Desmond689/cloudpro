import { getMarketingStudioData } from "@/lib/actions/ai-marketing";
import AiMarketingStudioClient from "@/components/admin/AiMarketingStudioClient";

export default async function AiMarketingPage() {
  const data = await getMarketingStudioData();
  if (!data.ok) {
    return <p className="text-sm text-bad">Not authorized.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow mb-1">AI</p>
        <h1 className="font-display text-xl font-semibold">Marketing Studio</h1>
        <p className="mt-1 text-sm text-mute">
          Generate captions, scripts, and campaign copy. Approve before using anywhere.
        </p>
      </div>
      <AiMarketingStudioClient drafts={data.drafts} products={data.products} />
    </div>
  );
}
