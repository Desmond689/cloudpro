import { createServerSupabaseClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const supabase = createServerSupabaseClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("name");

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-xl font-semibold">New product</h1>
      <div className="card p-5">
        <ProductForm categories={categories ?? []} />
      </div>
      <p className="text-xs text-faint">
        Save the product first, then add photos from the product's page.
      </p>
    </div>
  );
}
