import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getPost(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).single();
  return data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return {};
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || undefined,
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description || undefined,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  return (
    <article className="container-px mx-auto max-w-2xl py-16">
      {post.featured_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.featured_image} alt="" className="mb-8 aspect-video w-full rounded-2xl object-cover" />
      )}
      <p className="eyebrow mb-2">{post.author}</p>
      <h1 className="mb-6 font-display text-3xl font-semibold">{post.title}</h1>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-mute">{post.content}</div>
    </article>
  );
}
