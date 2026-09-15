"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendOrderTelegramAlert } from "@/lib/telegram";
import type { PaymentMethod, ShippingDetails } from "@/lib/types";

interface GiftCardInput {
  code: string;
  amount: number;
  imageBase64?: string; // raw base64 payload, no data: prefix
  imageMimeType?: string;
}

interface BtcPaymentInput {
  imageBase64: string; // raw base64 payload, no data: prefix — required for BTC orders
  imageMimeType: string;
}

interface CheckoutInput {
  shipping: ShippingDetails;
  paymentMethod: PaymentMethod;
  cartLines: { productId: string; quantity: number }[]; // client only sends id + qty
  deliveryZoneId?: string | null;
  giftCard?: GiftCardInput;
  btcPayment?: BtcPaymentInput;
}

const SHIPPING_COST = 6.99; // flat fallback rate, used only if no delivery zone is selected/configured

function generateOrderNumber() {
  return `CLD-${Math.floor(10000 + Math.random() * 89999)}`;
}

export async function createOrder(input: CheckoutInput) {
  const { shipping, paymentMethod, cartLines, deliveryZoneId, giftCard, btcPayment } = input;

  if (!cartLines.length) return { ok: false as const, error: "Your cart is empty." };
  for (const [key, value] of Object.entries(shipping)) {
    if (!String(value ?? "").trim()) {
      return { ok: false as const, error: `Missing required field: ${key}` };
    }
  }

  if (paymentMethod === "giftcard") {
    if (!giftCard || !giftCard.code?.trim()) {
      return { ok: false as const, error: "Please enter your gift card code." };
    }
    if (!giftCard.amount || giftCard.amount <= 0) {
      return { ok: false as const, error: "Please enter the gift card amount." };
    }
  }

  // ---- BTC orders must prove payment before the order is ever created —
  // same principle as gift cards (code + amount required up front), but
  // for BTC the proof is a screenshot of the sent transaction. Re-checked
  // here server-side; the client-side check alone is never trusted. ----
  if (paymentMethod === "btc") {
    if (!btcPayment || !btcPayment.imageBase64 || !btcPayment.imageMimeType) {
      return { ok: false as const, error: "Please upload a screenshot of your BTC payment before placing the order." };
    }
  }

  const supabase = createServiceRoleClient();

  // ---- Read the real session (if any) from the request's own cookies —
  // never trust a client-supplied user id for this. A guest checking out
  // with no session simply gets auth_user_id: null, same as before. ----
  const {
    data: { user: sessionUser },
  } = await createServerSupabaseClient().auth.getUser();

  // ---- Re-fetch every product server-side. The browser's price/name/stock
  // is never trusted — only the product ID and requested quantity are used. ----
  const productIds = cartLines.map((l) => l.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, stock_quantity, is_published")
    .in("id", productIds);

  if (productsError || !products) {
    return { ok: false as const, error: "Could not verify your cart. Please try again." };
  }

  const validatedItems: { product_id: string; product_name: string; unit_price: number; quantity: number; subtotal: number }[] = [];

  for (const line of cartLines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product || !product.is_published) {
      return { ok: false as const, error: "One of your items is no longer available." };
    }
    if (line.quantity < 1 || product.stock_quantity < line.quantity) {
      return { ok: false as const, error: `Not enough stock for "${product.name}".` };
    }
    validatedItems.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity: line.quantity,
      subtotal: Number((product.price * line.quantity).toFixed(2)),
    });
  }

  const subtotal = Number(validatedItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2));

  // ---- Delivery zone: re-fetch the fee server-side. The client only ever
  // sends the zone id — the fee itself is never trusted from the browser. ----
  let shippingCost = SHIPPING_COST;
  let resolvedZoneId: string | null = null;
  if (deliveryZoneId) {
    const { data: zone } = await supabase
      .from("delivery_zones")
      .select("id, fee, is_active")
      .eq("id", deliveryZoneId)
      .single();
    if (zone && zone.is_active) {
      shippingCost = Number(zone.fee);
      resolvedZoneId = zone.id;
    }
  }

  const total = Number((subtotal + shippingCost).toFixed(2));

  // ---- Gift card photo (optional) — uploaded to a private bucket. Only
  // the storage path is stored on the order; admins view it later via a
  // short-lived signed URL, never a public link. ----
  let giftCardImagePath: string | null = null;
  if (paymentMethod === "giftcard" && giftCard?.imageBase64 && giftCard.imageMimeType) {
    try {
      const bytes = Buffer.from(giftCard.imageBase64, "base64");
      if (bytes.length > 8 * 1024 * 1024) {
        return { ok: false as const, error: "Gift card image must be under 8MB." };
      }
      const ext = giftCard.imageMimeType.split("/")[1] || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("giftcards")
        .upload(path, bytes, { contentType: giftCard.imageMimeType, upsert: false });
      if (!uploadError) giftCardImagePath = path;
    } catch {
      // A failed gift-card photo upload should never block the order —
      // the code/amount typed above is still saved and admins can follow up.
    }
  }

  // ---- BTC payment screenshot (required) — uploaded to a private bucket,
  // same pattern as the gift card photo above. Admins view it later via a
  // short-lived signed URL, never a public link. ----
  let btcScreenshotPath: string | null = null;
  if (paymentMethod === "btc" && btcPayment) {
    try {
      const bytes = Buffer.from(btcPayment.imageBase64, "base64");
      if (bytes.length > 8 * 1024 * 1024) {
        return { ok: false as const, error: "Payment screenshot must be under 8MB." };
      }
      const ext = btcPayment.imageMimeType.split("/")[1] || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("btc-payments")
        .upload(path, bytes, { contentType: btcPayment.imageMimeType, upsert: false });
      if (uploadError) {
        return { ok: false as const, error: "Could not upload your payment screenshot. Please try again." };
      }
      btcScreenshotPath = path;
    } catch {
      return { ok: false as const, error: "Could not upload your payment screenshot. Please try again." };
    }
  }

  // ---- Create customer ----
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      full_name: shipping.fullName,
      email: shipping.email,
      phone: shipping.phone,
      address: shipping.address,
      city: shipping.city,
      region: shipping.region,
      postal_code: shipping.postalCode,
      country: shipping.country,
    })
    .select()
    .single();

  if (customerError || !customer) {
    return { ok: false as const, error: "Could not save your details. Please try again." };
  }

  // ---- Create order ----
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: generateOrderNumber(),
      customer_id: customer.id,
      subtotal,
      shipping_cost: shippingCost,
      total,
      payment_method: paymentMethod,
      payment_status: "pending",
      order_status: "pending",
      shipping_snapshot: shipping,
      auth_user_id: sessionUser?.id ?? null,
      delivery_zone_id: resolvedZoneId,
      gift_card_code: paymentMethod === "giftcard" ? giftCard!.code.trim() : null,
      gift_card_amount: paymentMethod === "giftcard" ? giftCard!.amount : null,
      gift_card_image_path: giftCardImagePath,
      btc_screenshot_path: btcScreenshotPath,
    })
    .select()
    .single();

  if (orderError || !order) {
    return { ok: false as const, error: "Could not create your order. Please try again." };
  }

  // ---- Order items ----
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .insert(validatedItems.map((i) => ({ ...i, order_id: order.id })))
    .select();

  if (itemsError) {
    console.error("order_items insert failed for order", order.id, itemsError.message);
  }

  // ---- Decrement stock (best-effort per line; a proper atomic RPC can
  // replace this once the project is live and under real concurrency) ----
  for (const item of validatedItems) {
    const product = products.find((p) => p.id === item.product_id)!;
    await supabase
      .from("products")
      .update({ stock_quantity: product.stock_quantity - item.quantity })
      .eq("id", item.product_id);
  }

  // ---- Telegram alert — failure never blocks the order ----
  const { data: settings } = await supabase
    .from("store_settings")
    .select("telegram_chat_id_override, telegram_notify_new_order, telegram_message_template")
    .eq("id", true)
    .single();

  const alert = await sendOrderTelegramAlert(order, items ?? [], settings);
  await supabase
    .from("orders")
    .update({
      telegram_notified: alert.ok && !alert.skipped,
      telegram_error: alert.ok ? null : alert.error,
    })
    .eq("id", order.id);

  // ---- Phase 5: Order AI Agent (summary + risk flags) — non-blocking ----
  try {
    const { runOrderAgent } = await import("@/lib/ai/order-agent");
    await runOrderAgent({
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
        subtotal: order.subtotal,
        shipping_cost: order.shipping_cost,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.order_status,
        created_at: order.created_at,
        auth_user_id: order.auth_user_id,
        shipping_snapshot: order.shipping_snapshot,
        gift_card_code: order.gift_card_code,
        gift_card_amount: order.gift_card_amount,
        btc_screenshot_path: order.btc_screenshot_path,
      },
      items: (items ?? []).map((i: any) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        subtotal: i.subtotal,
      })),
    });
  } catch (err) {
    console.error("[order-agent]", err);
  }

  // ---- Phase 7: Inventory Agent on products just decremented — non-blocking ----
  try {
    const { runInventoryCheck } = await import("@/lib/ai/inventory-agent");
    await runInventoryCheck({
      productIds: validatedItems.map((i) => i.product_id),
    });
  } catch (err) {
    console.error("[inventory-agent]", err);
  }

  // ---- Phase 14: Customer memory + mark abandoned cart recovered ----
  try {
    const email = String(shipping.email || "").toLowerCase();
    if (email) {
      const { upsertCustomerMemoryFromOrder } = await import("@/lib/ai/customer-memory-agent");
      await upsertCustomerMemoryFromOrder({
        email,
        productNames: validatedItems.map((i) => i.product_name),
        orderTotal: total,
        orderAt: order.created_at,
      });
      const { markCartRecovered } = await import("@/lib/ai/abandoned-cart-agent");
      await markCartRecovered(email, order.id);
    }
  } catch (err) {
    console.error("[customer-memory]", err);
  }

  return { ok: true as const, orderId: order.id, orderNumber: order.order_number };
}
