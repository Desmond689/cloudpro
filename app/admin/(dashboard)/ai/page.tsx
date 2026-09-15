import { loadAiControlCenter } from "@/lib/actions/ai-admin";
import AiControlCenterClient from "@/components/admin/AiControlCenterClient";

export default async function AdminAiPage() {
  const data = await loadAiControlCenter();
  if (!data.ok) {
    return <p className="text-sm text-bad">Not authorized.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="eyebrow mb-1">AI</p>
        <h1 className="font-display text-xl font-semibold">AI Control Center</h1>
        <p className="mt-1 text-sm text-mute">
          Ask your business questions, toggle automations, and review AI activity.
        </p>
      </div>
      <AiControlCenterClient
        geminiConfigured={data.geminiConfigured}
        settings={data.settings}
        rules={data.rules}
        logs={data.logs}
        escalations={data.escalations}
        productDraftsToday={data.productDraftsToday}
        marketingDraftsOpen={data.marketingDraftsOpen}
        risks={data.risks}
        abandoned={data.abandoned}
      />
    </div>
  );
}
