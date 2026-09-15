"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function trackOrder(orderNumber: string, email: string) {
  const supabase = createServiceRoleClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*), customers(email)")
    .eq("order_number", orderNumber.trim())
    .single();

  // Require the email to match the order's customer — this is the only
  // check standing between a guest and someone else's order details.
  if (error || !order || order.customers?.email?.toLowerCase() !== email.trim().toLowerCase()) {
    return { ok: false as const, error: "No matching order found. Check your order ID and email." };
  }

  const { customers, ...safeOrder } = order;
  return { ok: true as const, order: safeOrder };
}
