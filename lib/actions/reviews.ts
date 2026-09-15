"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function submitReview(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 0);
  const reviewText = String(formData.get("reviewText") ?? "").trim();

  if (!productId || !customerName || rating < 1 || rating > 5 || !reviewText) {
    return { ok: false, error: "Please fill in every field with a rating between 1 and 5." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("reviews").insert({
    product_id: productId,
    customer_name: customerName.slice(0, 80),
    rating,
    review_text: reviewText.slice(0, 2000),
    is_approved: false,
  });

  if (error) {
    console.error("submitReview error:", error.message);
    return { ok: false, error: "Something went wrong submitting your review. Please try again." };
  }

  return { ok: true };
}
