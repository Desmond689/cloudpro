import { listProducts, listCategories } from "@/lib/data/products";
import ProductCard from "@/components/product/ProductCard";
import ShopFilters from "@/components/shop/ShopFilters";

export const revalidate = 60;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const categories = await listCategories();
  const { products, total, page, pageSize } = await listProducts({
    categorySlug: searchParams.category,
    brand: searchParams.brand,
    minPrice: searchParams.min ? Number(searchParams.min) : undefined,
    maxPrice: searchParams.max ? Number(searchParams.max) : undefined,
    minRating: searchParams.rating ? Number(searchParams.rating) : undefined,
    inStockOnly: searchParams.inStock === "1",
    sort: (searchParams.sort as never) ?? "newest",
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="container-px mx-auto max-w-7xl py-10 sm:py-14">
      <div className="mb-8">
        <p className="eyebrow mb-2">Shop</p>
        <h1 className="font-display text-3xl font-semibold">All products</h1>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <ShopFilters categories={categories} activeParams={searchParams} />

        <div className="flex-1">
          {products.length === 0 ? (
            <div className="card px-6 py-16 text-center">
              <p className="font-display text-lg">No products match those filters</p>
              <p className="mt-2 text-sm text-mute">Try clearing a filter or checking back later.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 font-mono text-xs text-mute">{total} product{total === 1 ? "" : "s"}</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex justify-center gap-2 font-mono text-xs">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <a
                      key={n}
                      href={`?${new URLSearchParams({ ...searchParams, page: String(n) } as never)}`}
                      className={`rounded-lg px-3 py-2 ${
                        n === page ? "bg-mist text-void" : "border border-line text-mute hover:text-ink"
                      }`}
                    >
                      {n}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
