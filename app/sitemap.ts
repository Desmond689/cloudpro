import type { MetadataRoute } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = createServerSupabaseClient();

  const [{ data: products }, { data: posts }] = await Promise.all([
    supabase.from("products").select("slug, updated_at").eq("is_published", true),
    supabase.from("blog_posts").select("slug, updated_at").eq("is_published", true),
  ]);

  const staticRoutes = [
    "", "/shop", "/search", "/track-order", "/about", "/contact", "/faq",
    "/privacy-policy", "/terms", "/refund-policy", "/blog",
  ].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));

  const productRoutes = (products ?? []).map((p) => ({
    url: `${base}/product/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
  }));

  const blogRoutes = (posts ?? []).map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
  }));

  return [...staticRoutes, ...productRoutes, ...blogRoutes];
}
