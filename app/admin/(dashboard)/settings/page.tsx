import { createServerSupabaseClient } from "@/lib/supabase/server";
import StoreSettingsForm from "@/components/admin/StoreSettingsForm";

export default async function AdminSettingsPage() {
  const supabase = createServerSupabaseClient();
  const { data: settings } = await supabase.from("store_settings").select("*").eq("id", true).single();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-xl font-semibold">Settings</h1>
      <StoreSettingsForm settings={settings ?? {}} />
    </div>
  );
}
