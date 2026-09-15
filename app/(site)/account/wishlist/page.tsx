import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";

export default async function AccountWishlistPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("wishlist_items")
    .select("id, products(*, product_images(*))")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const products = (data ?? [])
    .map((row: any) => row.products as Product | null)
    .filter((p): p is Product => Boolean(p));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Wishlist</h1>

      {products.length === 0 ? (
        <div className="card p-6 text-sm text-mute">
          Nothing saved yet.{" "}
          <Link href="/shop" className="text-mist">
            Browse the shop
          </Link>{" "}
          and tap "Add to wishlist" on any product.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
