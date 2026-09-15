"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendOrderTelegramAlert } from "@/lib/telegram";

// Every action here re-checks is_admin() itself (via the RLS-respecting
// server client) before doing anything — never trust that a request only
// reached this code because the UI hid the button. The service-role
// client is only used for the parts RLS can't express (storage uploads,
// resending Telegram), always after this same admin check.
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
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Parses the admin form's comma-separated flavors field into a clean
// string array — trims each entry, drops blanks, and de-dupes.
function parseFlavorsInput(raw: FormDataEntryValue | null): string[] {
  const value = String(raw ?? "");
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (trimmed) seen.add(trimmed);
  }
  return Array.from(seen);
}

// ---------- products ----------

export async function createProduct(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const stock = Number(formData.get("stock_quantity") ?? 0);

  if (!name || price < 0 || stock < 0) {
    return { ok: false as const, error: "Name, a valid price, and stock are required." };
  }

  const flavors = parseFlavorsInput(formData.get("flavors"));

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name,
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`,
      description: String(formData.get("description") ?? ""),
      price,
      brand: String(formData.get("brand") ?? ""),
      category_id: String(formData.get("category_id") ?? "") || null,
      stock_quantity: stock,
      low_stock_threshold: Number(formData.get("low_stock_threshold") ?? 5),
      is_published: formData.get("is_published") === "on",
      flavors,
    })
    .select()
    .single();

  if (error || !product) {
    return { ok: false as const, error: "Could not create the product." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true as const, productId: product.id };
}

export async function updateProduct(productId: string, formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const stock = Number(formData.get("stock_quantity") ?? 0);

  if (!name || price < 0 || stock < 0) {
    return { ok: false as const, error: "Name, a valid price, and stock are required." };
  }

  const flavors = parseFlavorsInput(formData.get("flavors"));

  const { error } = await supabase
    .from("products")
    .update({
      name,
      description: String(formData.get("description") ?? ""),
      price,
      brand: String(formData.get("brand") ?? ""),
      category_id: String(formData.get("category_id") ?? "") || null,
      stock_quantity: stock,
      low_stock_threshold: Number(formData.get("low_stock_threshold") ?? 5),
      is_published: formData.get("is_published") === "on",
      flavors,
    })
    .eq("id", productId);

  if (error) return { ok: false as const, error: "Could not update the product." };

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true as const };
}

export async function toggleProductPublished(productId: string, isPublished: boolean) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase
    .from("products")
    .update({ is_published: isPublished })
    .eq("id", productId);

  if (error) return { ok: false as const, error: "Could not update product." };

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true as const };
}

export async function deleteProduct(productId: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { ok: false as const, error: "Could not delete the product." };

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: true as const };
}

// Uploading straight from a phone's camera/gallery — a File, not a URL.
export async function uploadProductImage(productId: string, formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false as const, error: "No file selected." };
  if (!file.type.startsWith("image/")) return { ok: false as const, error: "Please select an image file." };
  if (file.size > 8 * 1024 * 1024) return { ok: false as const, error: "Image must be under 8MB." };

  // Storage writes go through the service-role client (storage RLS is
  // enforced by the bucket policies in 0003_storage.sql, which already
  // require is_admin() — this call is redundant-safe, not a bypass).
  const admin = createServiceRoleClient();
  const path = `${productId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const { error: uploadError } = await admin.storage.from("product-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { ok: false as const, error: "Upload failed. Please try again." };

  const { data: publicUrl } = admin.storage.from("product-images").getPublicUrl(path);

  const { data: existingCount } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    url: publicUrl.publicUrl,
    sort_order: existingCount ? 0 : 0,
  });

  if (insertError) return { ok: false as const, error: "Image uploaded but could not be linked." };

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  return { ok: true as const, url: publicUrl.publicUrl };
}

export async function deleteProductImage(imageId: string, productId: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false as const, error: "Could not remove the image." };

  revalidatePath(`/admin/products/${productId}`);
  return { ok: true as const };
}

export async function createCategory(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false as const, error: "Name is required." };

  const { error } = await supabase.from("categories").insert({ name, slug: slugify(name) });
  if (error) return { ok: false as const, error: "Could not create the category." };

  revalidatePath("/admin/products");
  return { ok: true as const };
}

// ---------- orders ----------

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase.from("orders").update({ order_status: status }).eq("id", orderId);
  if (error) return { ok: false as const, error: "Could not update order status." };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true as const };
}

export async function updatePaymentStatus(orderId: string, status: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase.from("orders").update({ payment_status: status }).eq("id", orderId);
  if (error) return { ok: false as const, error: "Could not update payment status." };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true as const };
}

export async function resendTelegramAlert(orderId: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
  if (!order) return { ok: false as const, error: "Order not found." };

  const { data: settings } = await supabase
    .from("store_settings")
    .select("telegram_chat_id_override, telegram_notify_new_order, telegram_message_template")
    .eq("id", true)
    .single();

  // Resend is an explicit admin action — always send, even if the
  // "new order" auto-alert toggle is off.
  const result = await sendOrderTelegramAlert(order, items ?? [], {
    ...settings,
    telegram_notify_new_order: true,
  });
  await supabase
    .from("orders")
    .update({ telegram_notified: result.ok, telegram_error: result.ok ? null : result.error })
    .eq("id", orderId);

  revalidatePath(`/admin/orders/${orderId}`);
  return result;
}

// ---------- reviews ----------

export async function approveReview(reviewId: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { data: review, error } = await supabase
    .from("reviews")
    .update({ is_approved: true })
    .eq("id", reviewId)
    .select()
    .single();
  if (error || !review) return { ok: false as const, error: "Could not approve review." };

  // Recompute the product's rating + review_count from approved reviews.
  const { data: approved } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", review.product_id)
    .eq("is_approved", true);

  const count = approved?.length ?? 0;
  const avg = count ? approved!.reduce((s, r) => s + r.rating, 0) / count : 0;

  await supabase
    .from("products")
    .update({ rating: Number(avg.toFixed(1)), review_count: count })
    .eq("id", review.product_id);

  revalidatePath("/admin/reviews");
  return { ok: true as const };
}

export async function deleteReview(reviewId: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) return { ok: false as const, error: "Could not delete review." };

  revalidatePath("/admin/reviews");
  return { ok: true as const };
}

// ---------- store settings ----------

export async function updateStoreSettings(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase
    .from("store_settings")
    .update({
      btc_address: String(formData.get("btc_address") ?? ""),
      social_instagram: String(formData.get("social_instagram") ?? ""),
      social_tiktok: String(formData.get("social_tiktok") ?? ""),
      social_youtube: String(formData.get("social_youtube") ?? ""),
      social_facebook: String(formData.get("social_facebook") ?? ""),
      social_x: String(formData.get("social_x") ?? ""),
      social_whatsapp: String(formData.get("social_whatsapp") ?? ""),
      age_verification_enabled: formData.get("age_verification_enabled") === "on",
    })
    .eq("id", true);

  if (error) return { ok: false as const, error: "Could not save settings." };

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function updateTelegramSettings(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase
    .from("store_settings")
    .update({
      telegram_chat_id_override: String(formData.get("telegram_chat_id_override") ?? "").trim() || null,
      telegram_notify_new_order: formData.get("telegram_notify_new_order") === "on",
      telegram_notify_low_stock: formData.get("telegram_notify_low_stock") === "on",
      telegram_notify_new_message: formData.get("telegram_notify_new_message") === "on",
      telegram_message_template: String(formData.get("telegram_message_template") ?? "").trim() || null,
    })
    .eq("id", true);

  if (error) return { ok: false as const, error: "Could not save Telegram settings." };

  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function uploadBtcQr(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false as const, error: "No file selected." };
  if (!file.type.startsWith("image/")) return { ok: false as const, error: "Please select an image file." };

  const admin = createServiceRoleClient();
  const path = `qr-${Date.now()}.${file.type.split("/")[1] || "png"}`;

  const { error: uploadError } = await admin.storage.from("payment-qr").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { ok: false as const, error: "Upload failed." };

  const { data: publicUrl } = admin.storage.from("payment-qr").getPublicUrl(path);

  const { error } = await supabase.from("store_settings").update({ btc_qr_url: publicUrl.publicUrl }).eq("id", true);
  if (error) return { ok: false as const, error: "QR uploaded but could not be saved." };

  revalidatePath("/", "layout");
  return { ok: true as const, url: publicUrl.publicUrl };
}

// ---------- delivery / shipping zones ----------

export async function createDeliveryZone(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const name = String(formData.get("name") ?? "").trim();
  const fee = Number(formData.get("fee") ?? 0);
  if (!name) return { ok: false as const, error: "Zone name is required." };
  if (Number.isNaN(fee) || fee < 0) return { ok: false as const, error: "Enter a valid fee." };

  const { error } = await supabase.from("delivery_zones").insert({ name, fee });
  if (error) return { ok: false as const, error: "Could not create delivery zone." };

  revalidatePath("/admin/delivery");
  return { ok: true as const };
}

export async function updateDeliveryZone(zoneId: string, formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const name = String(formData.get("name") ?? "").trim();
  const fee = Number(formData.get("fee") ?? 0);
  if (!name) return { ok: false as const, error: "Zone name is required." };
  if (Number.isNaN(fee) || fee < 0) return { ok: false as const, error: "Enter a valid fee." };

  const { error } = await supabase.from("delivery_zones").update({ name, fee }).eq("id", zoneId);
  if (error) return { ok: false as const, error: "Could not update delivery zone." };

  revalidatePath("/admin/delivery");
  return { ok: true as const };
}

export async function toggleDeliveryZoneActive(zoneId: string, isActive: boolean) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase.from("delivery_zones").update({ is_active: isActive }).eq("id", zoneId);
  if (error) return { ok: false as const, error: "Could not update delivery zone." };

  revalidatePath("/admin/delivery");
  return { ok: true as const };
}

export async function deleteDeliveryZone(zoneId: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { error } = await supabase.from("delivery_zones").delete().eq("id", zoneId);
  if (error) return { ok: false as const, error: "Could not delete delivery zone." };

  revalidatePath("/admin/delivery");
  return { ok: true as const };
}

// ---------- customers ----------

// A signed URL, not a public one — gift-card photos are sensitive and
// live in a private bucket. Expires in 10 minutes.
export async function getGiftCardImageUrl(path: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage.from("giftcards").createSignedUrl(path, 600);
  if (error || !data) return { ok: false as const, error: "Could not load image." };
  return { ok: true as const, url: data.signedUrl };
}

// A signed URL, not a public one — BTC payment screenshots are sensitive
// and live in a private bucket. Expires in 10 minutes.
export async function getBtcScreenshotUrl(path: string) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage.from("btc-payments").createSignedUrl(path, 600);
  if (error || !data) return { ok: false as const, error: "Could not load image." };
  return { ok: true as const, url: data.signedUrl };
}

// Blocking only makes sense for a registered (auth.users) account — guest
// checkouts have no login to disable. `get_auth_user_by_email` is a
// security-definer function that itself re-checks is_admin(), so this is
// safe even though it reaches into auth.users.
export async function setCustomerBlocked(email: string, blocked: boolean) {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false as const, error: "Not authorized." };

  const { data: rows, error: lookupError } = await supabase.rpc("get_auth_user_by_email", {
    target_email: email,
  });
  if (lookupError || !rows || rows.length === 0) {
    return { ok: false as const, error: "No registered account exists for this email." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(rows[0].id, {
    ban_duration: blocked ? "876000h" : "none", // ~100 years ≈ indefinite, vs "none" to lift it
  });
  if (error) return { ok: false as const, error: "Could not update this account." };

  revalidatePath(`/admin/customers/${encodeURIComponent(email)}`);
  return { ok: true as const };
}
