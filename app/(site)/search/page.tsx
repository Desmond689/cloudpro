import Link from "next/link";
import { searchProducts } from "@/lib/data/products";
import ProductCard from "@/components/product/ProductCard";
import { Search } from "@/components/ui/Icons";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q?.trim() ?? "";
  const products = query ? await searchProducts(query) : [];

  return (
    <div className="container-px mx-auto max-w-7xl py-10 sm:py-14">
      <form action="/search" className="mx-auto mb-10 max-w-lg">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-raised px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-mute" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search products, brands…"
            autoFocus
            className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
          />
        </div>
      </form>

      {!query ? (
        <p className="text-center text-sm text-mute">Search for a product name, brand, or category.</p>
      ) : products.length === 0 ? (
        <div className="card mx-auto max-w-md p-10 text-center">
          <p className="text-sm text-mute">
            No results for &ldquo;{query}&rdquo;. Try a different term, or{" "}
            <Link href="/shop" className="text-mist hover:underline">
              browse the full shop
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-mute">
            {products.length} result{products.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
