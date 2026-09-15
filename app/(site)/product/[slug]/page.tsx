import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getProductBySlug, listRelatedProducts } from "@/lib/data/products";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Star } from "@/components/ui/Icons";
import ProductPurchasePanel from "@/components/product/ProductPurchasePanel";
import ProductCard from "@/components/product/ProductCard";
import ReviewForm from "@/components/product/ReviewForm";
import ShareButton from "@/components/product/ShareButton";
import WishlistButton from "@/components/product/WishlistButton";
import type { Review } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  return {
    title: `${product.name} — Cloudra`,
    description: product.description.slice(0, 155),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 155),
      images: product.product_images?.[0]?.url ? [product.product_images[0].url] : [],
    },
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const [related, supabase] = await Promise.all([listRelatedProducts(product), Promise.resolve(createServerSupabaseClient())]);
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", product.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isWishlisted = false;
  if (user) {
    const { data: wishlistRow } = await supabase
      .from("wishlist_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();
    isWishlisted = Boolean(wishlistRow);
  }

  const images = (product.product_images ?? []).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="container-px mx-auto max-w-7xl py-10 sm:py-14">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-raised">
            {images[0] ? (
              <Image src={images[0].url} alt={images[0].alt_text ?? product.name} fill className="object-cover" priority />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-faint">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.slice(1).map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-line bg-raised">
                  <Image src={img.url} alt={img.alt_text ?? product.name} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.categories && <p className="eyebrow mb-2">{product.categories.name}</p>}
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-2 text-sm text-mute">
            <div className="flex items-center gap-1 text-mist">
              <Star className="h-4 w-4" filled />
              <span>{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-faint">·</span>
            <span>{product.review_count} reviews</span>
            {product.brand && (
              <>
                <span className="text-faint">·</span>
                <span>{product.brand}</span>
              </>
            )}
          </div>

          <p className="mt-5 font-mono text-2xl font-medium">${product.price.toFixed(2)}</p>

          <p
            className={`mt-2 font-mono text-xs ${
              product.stock_quantity <= 0
                ? "text-bad"
                : product.stock_quantity <= product.low_stock_threshold
                ? "text-warn"
                : "text-ok"
            }`}
          >
            {product.stock_quantity <= 0
              ? "Out of stock"
              : product.stock_quantity <= product.low_stock_threshold
              ? `Low stock — ${product.stock_quantity} left`
              : "In stock"}
          </p>

          <p className="mt-5 text-sm leading-relaxed text-mute">{product.description}</p>

          {Object.keys(product.specifications ?? {}).length > 0 && (
            <div className="mt-6">
              <p className="eyebrow mb-3">Specifications</p>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-mute">{k}</dt>
                    <dd className="text-ink">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <ProductPurchasePanel product={product} />

          <p className="mt-4 text-xs text-mute">
            Buying more than a few units?{" "}
            <a href="/wholesale" className="text-mist hover:underline">
              Get wholesale pricing
            </a>
            .
          </p>

          <div className="mt-3 flex items-center gap-4">
            <ShareButton title={product.name} />
            <WishlistButton productId={product.id} initialWishlisted={isWishlisted} />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-16">
        <div className="vapor-divider mb-10" />
        <h2 className="mb-6 font-display text-xl font-semibold">Reviews</h2>

        {reviews && reviews.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {(reviews as Review[]).map((r) => (
              <div key={r.id} className="card p-5">
                <div className="mb-2 flex items-center gap-1 text-mist">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5" filled={i < r.rating} />
                  ))}
                </div>
                <p className="text-sm text-ink">{r.review_text}</p>
                <p className="mt-2 font-mono text-xs text-faint">{r.customer_name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-mute">No reviews yet — be the first.</p>
        )}

        <div className="mt-8">
          <ReviewForm productId={product.id} />
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-16">
          <div className="vapor-divider mb-10" />
          <h2 className="mb-6 font-display text-xl font-semibold">You might also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
