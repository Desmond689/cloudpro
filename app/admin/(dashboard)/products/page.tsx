import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import CategoryQuickAdd from "@/components/admin/CategoryQuickAdd";
import PublishToggleButton from "@/components/admin/PublishToggleButton";

export default async function AdminProductsPage() {
  const supabase = createServerSupabaseClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, stock_quantity, is_published, product_images(url)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary px-4 py-2 text-xs">
          + New product
        </Link>
      </div>

      <div className="card p-4">
        <p className="mb-2 text-xs text-mute">Categories</p>
        <CategoryQuickAdd />
      </div>

      {!products || products.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">
          No products yet — add your first one from your phone.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="card flex gap-3 p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-raised">
                {p.product_images?.[0]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.product_images[0].url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="font-mono text-xs text-mute">${Number(p.price).toFixed(2)}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className={p.stock_quantity > 0 ? "text-ok" : "text-bad"}>
                    {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : "Out of stock"}
                  </span>
                  <PublishToggleButton productId={p.id} isPublished={p.is_published} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
