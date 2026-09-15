"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// Creates the account fully confirmed, server-side, via the admin API —
// no confirmation email is sent, so there's no broken localhost link and
// no wait. The account is ready to sign into the moment this returns.
export async function signUpCustomer(fullName: string, email: string, password: string) {
  if (!fullName.trim()) return { ok: false as const, error: "Name is required." };
  if (!email.trim()) return { ok: false as const, error: "Email is required." };
  if (password.length < 6) return { ok: false as const, error: "Password must be at least 6 characters." };

  const admin = createServiceRoleClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true, // account is immediately usable, no verification link
    user_metadata: { full_name: fullName.trim() },
  });

  if (error) {
    // Supabase returns a generic-ish message here; map the common case to
    // something clearer for the person signing up.
    if (error.message.toLowerCase().includes("already been registered") || error.status === 422) {
      return { ok: false as const, error: "An account with this email already exists." };
    }
    return { ok: false as const, error: error.message || "Could not create your account." };
  }

  return { ok: true as const, userId: data.user?.id };
}

// Every action here relies on RLS (customer_addresses / wishlist_items /
// orders "owner" policies in 0004_customer_accounts.sql) to scope reads
// and writes to the logged-in user — auth.uid() is enforced by Postgres,
// not just checked in application code.
async function requireUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

// ---------- addresses ----------

export async function addAddress(formData: FormData) {
  const ctx = await requireUser();
  if (!ctx) return { ok: false as const, error: "Please sign in first." };
  const { supabase, user } = ctx;

  const isDefault = formData.get("is_default") === "on";

  if (isDefault) {
    await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase.from("customer_addresses").insert({
    user_id: user.id,
    label: String(formData.get("label") ?? "Home").trim() || "Home",
    full_name: String(formData.get("full_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    region: String(formData.get("region") ?? "").trim(),
    postal_code: String(formData.get("postal_code") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    is_default: isDefault,
  });

  if (error) return { ok: false as const, error: "Could not save address." };
  revalidatePath("/account/addresses");
  return { ok: true as const };
}

export async function deleteAddress(addressId: string) {
  const ctx = await requireUser();
  if (!ctx) return { ok: false as const, error: "Please sign in first." };

  const { error } = await ctx.supabase.from("customer_addresses").delete().eq("id", addressId);
  if (error) return { ok: false as const, error: "Could not delete address." };
  revalidatePath("/account/addresses");
  return { ok: true as const };
}

export async function setDefaultAddress(addressId: string) {
  const ctx = await requireUser();
  if (!ctx) return { ok: false as const, error: "Please sign in first." };
  const { supabase, user } = ctx;

  await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
  const { error } = await supabase
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId);

  if (error) return { ok: false as const, error: "Could not update address." };
  revalidatePath("/account/addresses");
  return { ok: true as const };
}

// ---------- wishlist ----------

export async function toggleWishlist(productId: string) {
  const ctx = await requireUser();
  if (!ctx) return { ok: false as const, error: "Please sign in to save favorites.", signedIn: false as const };
  const { supabase, user } = ctx;

  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("wishlist_items").delete().eq("id", existing.id);
    if (error) return { ok: false as const, error: "Could not update wishlist.", signedIn: true as const };
    revalidatePath("/account/wishlist");
    return { ok: true as const, wishlisted: false, signedIn: true as const };
  }

  const { error } = await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false as const, error: "Could not update wishlist.", signedIn: true as const };
  revalidatePath("/account/wishlist");
  return { ok: true as const, wishlisted: true, signedIn: true as const };
}
