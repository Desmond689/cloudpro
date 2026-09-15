"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("admin_users").select("id").eq("id", user.id).single();
  return data ? supabase : null;
}

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function createBlogPost(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false as const, error: "Title is required." };

  const isPublished = formData.get("is_published") === "on";
  const { data: post, error } = await supabase
    .from("blog_posts")
    .insert({
      title,
      slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`,
      content: String(formData.get("content") ?? ""),
      seo_title: String(formData.get("seo_title") ?? "") || null,
      seo_description: String(formData.get("seo_description") ?? "") || null,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error || !post) return { ok: false as const, error: "Could not create the post." };

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { ok: true as const, postId: post.id };
}

export async function updateBlogPost(postId: string, formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false as const, error: "Title is required." };
  const isPublished = formData.get("is_published") === "on";

  const { data: existing } = await supabase.from("blog_posts").select("published_at").eq("id", postId).single();

  const { error } = await supabase
    .from("blog_posts")
    .update({
      title,
      content: String(formData.get("content") ?? ""),
      seo_title: String(formData.get("seo_title") ?? "") || null,
      seo_description: String(formData.get("seo_description") ?? "") || null,
      is_published: isPublished,
      published_at: isPublished ? existing?.published_at ?? new Date().toISOString() : null,
    })
    .eq("id", postId);

  if (error) return { ok: false as const, error: "Could not update the post." };

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { ok: true as const };
}

export async function deleteBlogPost(postId: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase.from("blog_posts").delete().eq("id", postId);
  if (error) return { ok: false as const, error: "Could not delete the post." };

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { ok: true as const };
}

export async function uploadBlogImage(postId: string, formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false as const, error: "No file selected." };
  if (!file.type.startsWith("image/")) return { ok: false as const, error: "Please select an image." };

  const admin = createServiceRoleClient();
  const path = `${postId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error: uploadError } = await admin.storage.from("blog-images").upload(path, file, {
    contentType: file.type,
  });
  if (uploadError) return { ok: false as const, error: "Upload failed." };

  const { data: publicUrl } = admin.storage.from("blog-images").getPublicUrl(path);
  const { error } = await supabase.from("blog_posts").update({ featured_image: publicUrl.publicUrl }).eq("id", postId);
  if (error) return { ok: false as const, error: "Uploaded but could not save." };

  revalidatePath(`/admin/blog/${postId}`);
  return { ok: true as const, url: publicUrl.publicUrl };
}
