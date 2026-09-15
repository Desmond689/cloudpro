import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import BlogPostForm from "@/components/admin/BlogPostForm";
import BlogImageUploader from "@/components/admin/BlogImageUploader";

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: post } = await supabase.from("blog_posts").select("*").eq("id", params.id).single();
  if (!post) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-xl font-semibold">Edit post</h1>
      <div className="card p-5">
        <h2 className="mb-3 font-display text-sm font-medium">Featured image</h2>
        <BlogImageUploader postId={post.id} imageUrl={post.featured_image} />
      </div>
      <div className="card p-5">
        <BlogPostForm defaults={post} />
      </div>
    </div>
  );
}
