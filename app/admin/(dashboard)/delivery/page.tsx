import { createServerSupabaseClient } from "@/lib/supabase/server";
import DeliveryZoneForm from "@/components/admin/DeliveryZoneForm";
import DeliveryZoneRow from "@/components/admin/DeliveryZoneRow";

export default async function AdminDeliveryPage() {
  const supabase = createServerSupabaseClient();
  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("id, name, fee, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Delivery & shipping</h1>
        <p className="mt-1 text-sm text-mute">
          Zones shown here appear as fee options at checkout. If no zones are configured, the flat rate built into
          checkout is used instead.
        </p>
      </div>

      <div className="card p-4">
        <p className="mb-3 text-xs text-mute">Add a delivery zone</p>
        <DeliveryZoneForm />
      </div>

      {!zones || zones.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">
          No delivery zones yet — checkout will use the flat shipping rate.
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {zones.map((zone) => (
            <DeliveryZoneRow key={zone.id} zone={zone} />
          ))}
        </div>
      )}
    </div>
  );
}
