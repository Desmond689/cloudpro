import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { Star } from "@/components/ui/Icons";
import AddToCartButton from "@/components/cart/AddToCartButton";
import TiltCard from "@/components/ui/TiltCard";

export default function ProductCard({ product }: { product: Product }) {
  const image = product.product_images?.sort((a, b) => a.sort_order - b.sort_order)[0];
  const hasFlavors = (product.flavors?.length ?? 0) > 0;
  const stockLabel =
    product.stock_quantity <= 0
      ? { text: "Out of stock", cls: "text-bad" }
      : product.stock_quantity <= product.low_stock_threshold
      ? { text: "Low stock", cls: "text-warn" }
      : { text: "In stock", cls: "text-ok" };

  return (
    <TiltCard strength={5} className="group">
      <div className="card flex h-full flex-col overflow-hidden transition group-hover:shadow-mist">
        <Link href={`/product/${product.slug}`} className="relative block aspect-square bg-raised">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt_text ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-faint">No image</div>
          )}
          {hasFlavors && (
            <span className="absolute left-2 top-2 rounded-full border border-line bg-void/80 px-2.5 py-1 font-mono text-[10px] text-mist backdrop-blur">
              {product.flavors!.length} flavors
            </span>
          )}
        </Link>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <Link href={`/product/${product.slug}`} className="font-display text-sm font-medium leading-snug hover:text-mist">
            {product.name}
          </Link>

          <div className="flex items-center gap-1 text-xs text-mute">
            <Star className="h-3.5 w-3.5 text-mist" filled />
            <span>{product.rating.toFixed(1)}</span>
            <span className="text-faint">({product.review_count})</span>
          </div>

          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="font-mono text-sm font-medium text-ink">${product.price.toFixed(2)}</span>
            <span className={`font-mono text-[11px] ${stockLabel.cls}`}>{stockLabel.text}</span>
          </div>

          {hasFlavors ? (
            <Link
              href={`/product/${product.slug}`}
              className="w-full rounded-lg border border-line py-2 text-center text-xs font-medium text-ink transition hover:border-mist/50 hover:text-mist"
            >
              Choose flavor
            </Link>
          ) : (
            <AddToCartButton product={product} compact />
          )}
        </div>
      </div>
    </TiltCard>
  );
}
