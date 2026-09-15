import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Blog — Cloudra" };

export default async function BlogListPage() {
  const supabase = createServerSupabaseClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, featured_image, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  return (
    <div className="container-px mx-auto max-w-4xl py-16">
      <p className="eyebrow mb-2">Cloudra</p>
      <h1 className="mb-8 font-display text-3xl font-semibold">Blog</h1>

      {!posts || posts.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">No posts yet — check back soon.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="card block p-5">
              <h2 className="font-display text-lg font-medium">{p.title}</h2>
              {p.published_at && (
                <p className="mt-1 text-xs text-mute">{new Date(p.published_at).toLocaleDateString()}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
