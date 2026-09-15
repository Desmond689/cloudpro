import Link from "next/link";
import { Star } from "@/components/ui/Icons";

export default function Reviews() {
  const reviews: never[] = [];

  return (
    <section className="container-px mx-auto max-w-7xl py-16 sm:py-20">
      <h2 className="mb-8 font-display text-2xl font-semibold sm:text-3xl">
        What customers say
      </h2>

      {reviews.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex gap-1 text-faint">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4" />
            ))}
          </div>
          <p className="text-sm text-mute">
            No reviews yet — this store is new. Approved customer reviews will
            show up here as orders come in.
          </p>
          <Link href="/shop" className="mt-1 text-sm text-mist hover:underline">
            Be the first to order and review
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">{/* review cards render here */}</div>
      )}
    </section>
  );
}
