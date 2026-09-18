import { createServerSupabaseClient } from "@/lib/supabase/server";
import WholesaleInquiryRow from "@/components/admin/WholesaleInquiryRow";
import type { WholesaleInquiry } from "@/lib/types";

export default async function AdminWholesalePage() {
  const supabase = createServerSupabaseClient();
  const { data: inquiries } = await supabase
    .from("wholesale_inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (inquiries ?? []) as WholesaleInquiry[];
  const newCount = rows.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Wholesale inquiries</h1>
        {newCount > 0 && (
          <span className="rounded-full bg-warn/15 px-3 py-1 text-xs font-medium text-warn">{newCount} new</span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">No wholesale inquiries yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((inquiry) => (
            <WholesaleInquiryRow key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  );
}
