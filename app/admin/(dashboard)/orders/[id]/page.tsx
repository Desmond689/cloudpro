import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import OrderStatusControls from "@/components/admin/OrderStatusControls";
import GiftCardImage from "@/components/admin/GiftCardImage";
import BtcScreenshotImage from "@/components/admin/BtcScreenshotImage";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("*, delivery_zones(name, fee)").eq("id", params.id).single(),
    supabase.from("order_items").select("*").eq("order_id", params.id),
  ]);

  if (!order) notFound();
  const shipping = order.shipping_snapshot ?? {};

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="eyebrow mb-1">{order.order_number}</p>
        <h1 className="font-display text-xl font-semibold">Order details</h1>
      </div>

      <div className="card p-5">
        <OrderStatusControls
          orderId={order.id}
          orderStatus={order.order_status}
          paymentStatus={order.payment_status}
          telegramNotified={order.telegram_notified}
        />
        {order.telegram_error && (
          <p className="mt-3 text-xs text-bad">Last Telegram error: {order.telegram_error}</p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-display text-sm font-medium">Customer</h2>
        <div className="space-y-1 text-sm text-mute">
          <p className="text-ink">{shipping.fullName}</p>
          <p>{shipping.email}</p>
          <p>{shipping.phone}</p>
          <p>
            {shipping.address}, {shipping.city}, {shipping.region} {shipping.postalCode}
          </p>
          <p>{shipping.country}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-display text-sm font-medium">Items</h2>
        <div className="space-y-2">
          {(items ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>
                {item.product_name} <span className="text-mute">×{item.quantity}</span>
              </span>
              <span className="font-mono">${Number(item.subtotal).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between text-mute">
            <span>Subtotal</span>
            <span className="font-mono">${Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-mute">
            <span>Shipping</span>
            <span className="font-mono">${Number(order.shipping_cost).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span className="font-mono">${Number(order.total).toFixed(2)}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-mute">
          Payment method: <span className="uppercase text-ink">{order.payment_method}</span>
          {order.payment_reference && <> · Ref: {order.payment_reference}</>}
        </p>
        {order.delivery_zones && (
          <p className="mt-1 text-xs text-mute">
            Delivery zone: <span className="text-ink">{order.delivery_zones.name}</span>
          </p>
        )}
      </div>

      {order.payment_method === "giftcard" && (
        <div className="card p-5">
          <h2 className="mb-3 font-display text-sm font-medium">Gift card submission</h2>
          <div className="space-y-1 text-sm">
            <p>
              Code: <span className="font-mono">{order.gift_card_code ?? "—"}</span>
            </p>
            <p>
              Claimed amount:{" "}
              <span className="font-mono">
                {order.gift_card_amount != null ? `$${Number(order.gift_card_amount).toFixed(2)}` : "—"}
              </span>
            </p>
          </div>
          {order.gift_card_image_path && <GiftCardImage path={order.gift_card_image_path} />}
        </div>
      )}

      {order.payment_method === "btc" && (
        <div className="card p-5">
          <h2 className="mb-3 font-display text-sm font-medium">BTC payment submission</h2>
          {order.btc_screenshot_path ? (
            <BtcScreenshotImage path={order.btc_screenshot_path} />
          ) : (
            <p className="text-xs text-mute">No payment screenshot on file.</p>
          )}
        </div>
      )}
    </div>
  );
}
