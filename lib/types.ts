export type OrderStatus =
  | "pending" | "confirmed" | "processing" | "shipped" | "in_transit" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "giftcard" | "btc";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
  alt_text: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  brand: string | null;
  category_id: string | null;
  specifications: Record<string, string>;
  stock_quantity: number;
  low_stock_threshold: number;
  rating: number;
  review_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  product_images?: ProductImage[];
  categories?: Category | null;
  /** Selectable flavor/variant options. Empty or null = no flavor choice needed. */
  flavors?: string[] | null;
  /** Optional bulk/wholesale price breaks, e.g. [{ minQty: 10, price: 19.99 }]. */
  wholesale_tiers?: WholesaleTier[] | null;
}

export interface WholesaleTier {
  minQty: number;
  price: number;
}

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  stock_quantity: number;
  /** Chosen flavor/variant, if the product offers any. */
  flavor?: string | null;
}

export interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  auth_user_id: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  order_status: OrderStatus;
  shipping_snapshot: ShippingDetails;
  delivery_zone_id: string | null;
  gift_card_code: string | null;
  gift_card_amount: number | null;
  gift_card_image_path: string | null;
  btc_screenshot_path: string | null;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  is_active: boolean;
  sort_order: number;
}

export interface CustomerSummary {
  email: string;
  full_name: string | null;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  first_order_at: string;
  last_order_at: string;
  is_registered: boolean;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  products?: Product | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  flavor?: string | null;
}

export interface WholesaleInquiry {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  products_interested: string;
  estimated_monthly_volume: string | null;
  message: string | null;
  status: "new" | "contacted" | "closed";
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  is_approved: boolean;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  featured_image: string | null;
  content: string;
  author: string;
  is_published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
}

export interface StoreSettings {
  btc_address: string | null;
  btc_qr_url: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  social_facebook: string | null;
  social_x: string | null;
  social_whatsapp: string | null;
  age_verification_enabled: boolean;
  telegram_chat_id_override: string | null;
  telegram_notify_new_order: boolean;
  telegram_notify_low_stock: boolean;
  telegram_notify_new_message: boolean;
  telegram_message_template: string | null;
}
