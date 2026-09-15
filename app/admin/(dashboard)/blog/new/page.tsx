import BlogPostForm from "@/components/admin/BlogPostForm";

export default function NewBlogPostPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-xl font-semibold">New post</h1>
      <div className="card p-5">
        <BlogPostForm />
      </div>
    </div>
  );
}
