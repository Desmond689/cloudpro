"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBlogPost, updateBlogPost, deleteBlogPost } from "@/lib/actions/blog";

type Defaults = {
  id?: string;
  title?: string;
  content?: string;
  seo_title?: string;
  seo_description?: string;
  is_published?: boolean;
};

export default function BlogPostForm({ defaults }: { defaults?: Defaults }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(defaults?.id);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (isEdit) {
        const result = await updateBlogPost(defaults!.id!, formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/admin/blog/${defaults!.id}`);
      } else {
        const result = await createBlogPost(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/admin/blog/${result.postId}`);
      }
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!defaults?.id) return;
    if (!confirm("Delete this post?")) return;
    const result = await deleteBlogPost(defaults.id);
    if (result.ok) {
      router.push("/admin/blog");
      router.refresh();
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs text-mute">Title</label>
        <input
          name="title"
          required
          defaultValue={defaults?.title}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-mute">Content</label>
        <textarea
          name="content"
          rows={10}
          defaultValue={defaults?.content}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-mute">SEO title</label>
        <input
          name="seo_title"
          defaultValue={defaults?.seo_title}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-mute">SEO description</label>
        <textarea
          name="seo_description"
          rows={2}
          defaultValue={defaults?.seo_description}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm focus:border-mist/50"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_published" defaultChecked={defaults?.is_published ?? false} />
        Published
      </label>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn-primary flex-1 disabled:opacity-60">
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create post"}
        </button>
        {isEdit && (
          <button type="button" onClick={handleDelete} className="btn-secondary text-bad">
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
