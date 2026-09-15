import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product, Category } from "@/lib/types";

export interface ProductFilters {
  categorySlug?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "rating";
  query?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 24;

export async function listCategories(): Promise<Category[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) {
    console.error("listCategories error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function listProducts(filters: ProductFilters = {}) {
  const supabase = createServerSupabaseClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("products")
    .select("*, product_images(*), categories(*)", { count: "exact" })
    .eq("is_published", true);

  if (filters.categorySlug) {
    // Resolve category slug -> id first (kept simple/explicit rather than a join filter).
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .single();
    if (cat) q = q.eq("category_id", cat.id);
  }
  if (filters.brand) q = q.eq("brand", filters.brand);
  if (filters.minPrice != null) q = q.gte("price", filters.minPrice);
  if (filters.maxPrice != null) q = q.lte("price", filters.maxPrice);
  if (filters.minRating != null) q = q.gte("rating", filters.minRating);
  if (filters.inStockOnly) q = q.gt("stock_quantity", 0);
  if (filters.query) {
    q = q.textSearch("name", filters.query, { type: "websearch", config: "english" });
  }

  switch (filters.sort) {
    case "price_asc":
      q = q.order("price", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false });
      break;
    case "rating":
      q = q.order("rating", { ascending: false });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }

  const { data, error, count } = await q.range(from, to);
  if (error) {
    console.error("listProducts error:", error.message);
    return { products: [] as Product[], total: 0, page, pageSize };
  }
  return { products: (data ?? []) as Product[], total: count ?? 0, page, pageSize };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), categories(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (error) return null;
  return data as Product;
}

export async function listRelatedProducts(product: Product): Promise<Product[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("is_published", true)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .limit(4);
  if (error) return [];
  return (data ?? []) as Product[];
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("is_published", true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`)
    .limit(20);
  if (error) {
    console.error("searchProducts error:", error.message);
    return [];
  }
  return (data ?? []) as Product[];
}
