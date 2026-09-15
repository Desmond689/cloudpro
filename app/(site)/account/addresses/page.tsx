import { createServerSupabaseClient } from "@/lib/supabase/server";
import AddressManager from "@/components/account/AddressManager";
import type { CustomerAddress } from "@/lib/types";

export default async function AccountAddressesPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Saved addresses</h1>
      <AddressManager addresses={(data ?? []) as CustomerAddress[]} />
    </div>
  );
}
