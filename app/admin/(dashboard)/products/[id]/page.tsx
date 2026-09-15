import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*, product_images(*)").eq("id", params.id).single(),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  if (!product) notFound();

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="font-display text-xl font-semibold">Edit product</h1>

      <div className="card p-5">
        <h2 className="mb-3 font-display text-sm font-medium">Photos</h2>
        <ProductImageUploader
          productId={product.id}
          images={(product.product_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)}
        />
      </div>

      <div className="card p-5">
        <ProductForm categories={categories ?? []} defaults={product} />
      </div>
    </div>
  );
}
