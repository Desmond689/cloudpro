import Link from "next/link";
import { listProducts } from "@/lib/data/products";
import ProductCard from "@/components/product/ProductCard";
import { ChevronRight } from "@/components/ui/Icons";

export default async function FeaturedProducts() {
  const { products } = await listProducts({ sort: "rating", pageSize: 8 });

  return (
    <section className="container-px mx-auto max-w-7xl py-16 sm:py-20">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Popular right now</h2>
        <Link
          href="/shop"
          className="hidden items-center gap-0.5 text-sm text-mist hover:underline sm:flex"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <p className="font-display text-lg text-ink">Products are on their way</p>
          <p className="max-w-sm text-sm text-mute">
            The catalog is being stocked. Check back shortly, or browse the shop page once inventory is live.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
