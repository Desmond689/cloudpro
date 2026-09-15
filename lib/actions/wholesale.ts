"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export interface WholesaleInquiryInput {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  productsInterested: string;
  estimatedMonthlyVolume?: string;
  message?: string;
}

export async function submitWholesaleInquiry(input: WholesaleInquiryInput) {
  const businessName = input.businessName.trim().slice(0, 200);
  const contactName = input.contactName.trim().slice(0, 200);
  const email = input.email.trim().slice(0, 200);
  const phone = input.phone?.trim().slice(0, 50) || null;
  const productsInterested = input.productsInterested.trim().slice(0, 1000);
  const estimatedMonthlyVolume = input.estimatedMonthlyVolume?.trim().slice(0, 100) || null;
  const message = input.message?.trim().slice(0, 2000) || null;

  if (!businessName || !contactName || !email || !productsInterested) {
    return { ok: false as const, error: "Please fill in the required fields." };
  }
  if (!email.includes("@")) {
    return { ok: false as const, error: "Please enter a valid email." };
  }

  const rateLimit = await checkRateLimit(`wholesale:${email.toLowerCase()}`, 3, 60);
  if (!rateLimit.allowed) return { ok: false as const, error: rateLimit.error };

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("wholesale_inquiries").insert({
    business_name: businessName,
    contact_name: contactName,
    email,
    phone,
    products_interested: productsInterested,
    estimated_monthly_volume: estimatedMonthlyVolume,
    message,
  });

  if (error) {
    console.error("wholesale inquiry error:", error.message);
    return { ok: false as const, error: "Something went wrong. Please try again." };
  }

  try {
    const { sendTelegramText } = await import("@/lib/telegram");
    await sendTelegramText(
      `🏷️ *New wholesale inquiry*\nBusiness: ${businessName}\nContact: ${contactName} (${email})\nInterested in: ${productsInterested}`
    );
  } catch {
    // non-fatal
  }

  return { ok: true as const };
}
