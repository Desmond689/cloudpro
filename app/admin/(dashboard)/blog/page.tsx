import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminBlogPage() {
  const supabase = createServerSupabaseClient();
  const { data: posts } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Blog</h1>
        <Link href="/admin/blog/new" className="btn-primary px-4 py-2 text-xs">
          + New post
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">No posts yet.</div>
      ) : (
        <div className="card divide-y divide-line">
          {posts.map((p) => (
            <Link key={p.id} href={`/admin/blog/${p.id}`} className="flex items-center justify-between p-4 text-sm transition hover:bg-raised">
              <span className="truncate">{p.title}</span>
              <span className={p.is_published ? "text-mist" : "text-faint"}>{p.is_published ? "Published" : "Draft"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
