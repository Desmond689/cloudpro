import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { GeminiToolDeclaration } from "./gemini";

/**
 * Controlled AI tools — Phase 2 + 3
 * Gemini never receives DB credentials.
 * All data is real. No invented products, prices, or stock.
 */


/** Strip characters that break PostgREST .or() / ilike filter syntax. */
function sanitizeFilterValue(raw: string, maxLen = 80): string {
  return String(raw ?? "")
    .replace(/[%_,.()"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export const AI_TOOL_DECLARATIONS: GeminiToolDeclaration[] = [
  {
    name: "searchProducts",
    description:
      "Search published products by keyword, category, brand, features, or use-case. Returns real products with price, stock, rating, and product page links.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keywords or use-case (e.g. 'pod system for beginners', 'fruit e-liquid', 'disposable')",
        },
        category: { type: "string", description: "Optional category name or slug" },
        brand: { type: "string", description: "Optional brand name" },
        maxPrice: { type: "number", description: "Maximum price the customer can afford" },
        minPrice: { type: "number", description: "Optional minimum price" },
        inStockOnly: { type: "boolean", description: "Only return products with stock > 0 (default true)" },
        sort: {
          type: "string",
          description: "Sort: relevance | price_asc | price_desc | rating | newest (default relevance)",
        },
        limit: { type: "number", description: "Max results (default 5, max 8)" },
      },
    },
  },
  {
    name: "recommendProducts",
    description:
      "Intelligent recommendations based on budget, use-case, category, or preferences. Prefer in-stock, higher-rated products. Use when the customer asks what to buy or needs suggestions.",
    parameters: {
      type: "object",
      properties: {
        useCase: {
          type: "string",
          description: "What the customer needs it for (e.g. 'beginner', 'cloud chasing', 'MTL', 'gift')",
        },
        budget: { type: "number", description: "Maximum budget" },
        category: { type: "string", description: "Preferred category" },
        preferInStock: { type: "boolean", description: "Prefer in-stock items (default true)" },
        limit: { type: "number", description: "Number of recommendations (default 3, max 5)" },
      },
    },
  },
  {
    name: "getProduct",
    description: "Get full details of a single product by slug or id, including specs, stock, and link.",
    parameters: {
      type: "object",
      properties: {
        slugOrId: { type: "string", description: "Product slug or UUID" },
      },
      required: ["slugOrId"],
    },
  },
  {
    name: "compareProducts",
    description: "Compare 2–3 real products side by side (price, stock, rating, key differences). Use when customer asks which is better or wants a comparison.",
    parameters: {
      type: "object",
      properties: {
        slugOrIds: {
          type: "string",
          description: "Comma-separated product slugs or IDs (2 or 3 items)",
        },
      },
      required: ["slugOrIds"],
    },
  },
  {
    name: "checkStock",
    description: "Check real-time stock quantity for a product.",
    parameters: {
      type: "object",
      properties: {
        slugOrId: { type: "string", description: "Product slug or UUID" },
      },
      required: ["slugOrId"],
    },
  },
  {
    name: "getCategories",
    description: "List all product categories with names and slugs.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "getOrderStatus",
    description:
      "Look up order status by order number (e.g. CLD-12345) and customer email. Only returns data if email matches the order.",
    parameters: {
      type: "object",
      properties: {
        orderNumber: { type: "string", description: "Order number like CLD-12345" },
        email: { type: "string", description: "Customer email used on the order" },
      },
      required: ["orderNumber", "email"],
    },
  },
  {
    name: "getCartGuidance",
    description:
      "Return clear next-step instructions for adding a specific product to cart and proceeding to checkout. Use when customer shows buying intent (wants to buy, asks how to order, etc.).",
    parameters: {
      type: "object",
      properties: {
        slugOrId: { type: "string", description: "Product the customer wants" },
        quantity: { type: "number", description: "Desired quantity (default 1)" },
      },
      required: ["slugOrId"],
    },
  },
  {
    name: "escalateToHuman",
    description:
      "Escalate to a human admin. Use for payment disputes, refunds, angry customers, complaints, account problems, or when you cannot answer confidently.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Short reason for escalation" },
      },
      required: ["reason"],
    },
  },
  {
    name: "getLowStockProducts",
    description: "List products that are low on stock or out of stock (for admin/business questions).",
    parameters: {
      type: "object",
      properties: {
        includeOutOfStock: { type: "boolean", description: "Include fully out-of-stock items (default true)" },
      },
    },
  },
];

function productCard(p: any) {
  const images = (p.product_images ?? []).sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const image = images[0]?.url ?? null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const path = `/shop/${p.slug}`;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    brand: p.brand ?? null,
    stock: Number(p.stock_quantity ?? 0),
    inStock: Number(p.stock_quantity ?? 0) > 0,
    lowStock:
      Number(p.stock_quantity ?? 0) > 0 &&
      Number(p.stock_quantity ?? 0) <= Number(p.low_stock_threshold ?? 5),
    category: p.categories?.name ?? null,
    categorySlug: p.categories?.slug ?? null,
    rating: Number(p.rating ?? 0),
    reviewCount: Number(p.review_count ?? 0),
    shortDescription: String(p.description || "").slice(0, 180),
    path,
    url: siteUrl ? `${siteUrl}${path}` : path,
    image,
  };
}

function scoreProduct(p: any, preferInStock: boolean): number {
  let score = 0;
  const stock = Number(p.stock_quantity ?? 0);
  if (preferInStock && stock > 0) score += 50;
  if (stock === 0) score -= 30;
  score += Math.min(Number(p.rating ?? 0) * 8, 40);
  score += Math.min(Number(p.review_count ?? 0), 20);
  // slight preference for mid-range availability
  if (stock > 5) score += 5;
  return score;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: { conversationId: string; customerEmail?: string | null }
): Promise<{ result: unknown; logSummary: string }> {
  const supabase = createServiceRoleClient();

  switch (name) {
    case "searchProducts": {
      const query = sanitizeFilterValue(String(args.query ?? ""));
      const maxPrice = args.maxPrice != null ? Number(args.maxPrice) : undefined;
      const minPrice = args.minPrice != null ? Number(args.minPrice) : undefined;
      const inStockOnly = args.inStockOnly !== false;
      const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 8);
      const sort = String(args.sort ?? "relevance");

      let q = supabase
        .from("products")
        .select(
          "id, name, slug, description, price, brand, stock_quantity, low_stock_threshold, rating, review_count, product_images(url, sort_order), categories(name, slug)"
        )
        .eq("is_published", true)
        .limit(Math.max(limit * 3, 15)); // fetch extra then rank

      if (inStockOnly) q = q.gt("stock_quantity", 0);
      if (maxPrice != null && !Number.isNaN(maxPrice)) q = q.lte("price", maxPrice);
      if (minPrice != null && !Number.isNaN(minPrice)) q = q.gte("price", minPrice);
      if (query) {
        q = q.or(
          `name.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`
        );
      }
      if (args.category) {
        const cat = sanitizeFilterValue(String(args.category));
        const { data: catRow } = await supabase
          .from("categories")
          .select("id")
          .or(`name.ilike.%${cat}%,slug.ilike.%${cat}%`)
          .limit(1)
          .maybeSingle();
        if (catRow) q = q.eq("category_id", catRow.id);
      }
      if (args.brand) {
        q = q.ilike("brand", `%${sanitizeFilterValue(String(args.brand))}%`);
      }

      if (sort === "price_asc") q = q.order("price", { ascending: true });
      else if (sort === "price_desc") q = q.order("price", { ascending: false });
      else if (sort === "rating") q = q.order("rating", { ascending: false });
      else if (sort === "newest") q = q.order("created_at", { ascending: false });
      else q = q.order("rating", { ascending: false });

      const { data, error } = await q;
      if (error) {
        return {
          result: { error: "Search failed", products: [] },
          logSummary: `searchProducts error: ${error.message}`,
        };
      }

      let rows = data ?? [];
      if (sort === "relevance" || !sort) {
        rows = [...rows].sort((a, b) => scoreProduct(b, inStockOnly) - scoreProduct(a, inStockOnly));
      }
      const products = rows.slice(0, limit).map(productCard);
      return {
        result: { count: products.length, products },
        logSummary: `searchProducts q="${query}" → ${products.length}`,
      };
    }

    case "recommendProducts": {
      const useCase = sanitizeFilterValue(String(args.useCase ?? ""));
      const budget = args.budget != null ? Number(args.budget) : undefined;
      const preferInStock = args.preferInStock !== false;
      const limit = Math.min(Math.max(Number(args.limit) || 3, 1), 5);

      let q = supabase
        .from("products")
        .select(
          "id, name, slug, description, price, brand, stock_quantity, low_stock_threshold, rating, review_count, product_images(url, sort_order), categories(name, slug)"
        )
        .eq("is_published", true)
        .limit(40);

      if (preferInStock) q = q.gt("stock_quantity", 0);
      if (budget != null && !Number.isNaN(budget)) q = q.lte("price", budget);

      if (args.category) {
        const cat = sanitizeFilterValue(String(args.category));
        const { data: catRow } = await supabase
          .from("categories")
          .select("id")
          .or(`name.ilike.%${cat}%,slug.ilike.%${cat}%`)
          .limit(1)
          .maybeSingle();
        if (catRow) q = q.eq("category_id", catRow.id);
      }

      // Soft text filter for use-case keywords
      if (useCase) {
        q = q.or(
          `name.ilike.%${useCase}%,description.ilike.%${useCase}%,brand.ilike.%${useCase}%`
        );
      }

      const { data, error } = await q;
      if (error) {
        return {
          result: { error: "Recommendation failed", products: [] },
          logSummary: `recommendProducts error: ${error.message}`,
        };
      }

      let rows = data ?? [];
      // If use-case filter was too strict and returned nothing, broaden
      if (rows.length === 0 && useCase) {
        let q2 = supabase
          .from("products")
          .select(
            "id, name, slug, description, price, brand, stock_quantity, low_stock_threshold, rating, review_count, product_images(url, sort_order), categories(name, slug)"
          )
          .eq("is_published", true)
          .limit(40);
        if (preferInStock) q2 = q2.gt("stock_quantity", 0);
        if (budget != null && !Number.isNaN(budget)) q2 = q2.lte("price", budget);
        const { data: data2 } = await q2;
        rows = data2 ?? [];
      }

      rows = [...rows].sort((a, b) => scoreProduct(b, preferInStock) - scoreProduct(a, preferInStock));
      const products = rows.slice(0, limit).map(productCard);

      return {
        result: {
          count: products.length,
          useCase: useCase || null,
          budget: budget ?? null,
          products,
          note:
            products.length === 0
              ? "No matching products found with the given constraints. Try relaxing budget or category."
              : null,
        },
        logSummary: `recommendProducts useCase="${useCase}" budget=${budget} → ${products.length}`,
      };
    }

    case "getProduct": {
      const slugOrId = String(args.slugOrId ?? "").trim();
      if (!slugOrId) {
        return { result: { error: "Missing product identifier" }, logSummary: "getProduct missing id" };
      }

      const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
      let q = supabase
        .from("products")
        .select("*, product_images(*), categories(*)")
        .eq("is_published", true);
      q = isUuid ? q.eq("id", slugOrId) : q.eq("slug", slugOrId);

      const { data, error } = await q.maybeSingle();
      if (error || !data) {
        return { result: { error: "Product not found" }, logSummary: `getProduct ${slugOrId} not found` };
      }
      return {
        result: {
          ...productCard(data),
          description: data.description,
          specifications: data.specifications,
        },
        logSummary: `getProduct ${data.slug}`,
      };
    }

    case "compareProducts": {
      const raw = String(args.slugOrIds ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
      if (raw.length < 2) {
        return {
          result: { error: "Provide at least 2 product slugs or IDs to compare" },
          logSummary: "compareProducts need 2+",
        };
      }

      const products = [];
      for (const slugOrId of raw) {
        const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
        let q = supabase
          .from("products")
          .select(
            "id, name, slug, description, price, brand, stock_quantity, low_stock_threshold, rating, review_count, specifications, product_images(url, sort_order), categories(name, slug)"
          )
          .eq("is_published", true);
        q = isUuid ? q.eq("id", slugOrId) : q.eq("slug", slugOrId);
        const { data } = await q.maybeSingle();
        if (data) products.push({ ...productCard(data), specifications: data.specifications });
      }

      return {
        result: { count: products.length, products },
        logSummary: `compareProducts → ${products.length}`,
      };
    }

    case "checkStock": {
      const slugOrId = String(args.slugOrId ?? "").trim();
      const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
      let q = supabase
        .from("products")
        .select("id, name, slug, stock_quantity, low_stock_threshold")
        .eq("is_published", true);
      q = isUuid ? q.eq("id", slugOrId) : q.eq("slug", slugOrId);
      const { data } = await q.maybeSingle();
      if (!data) return { result: { error: "Product not found" }, logSummary: "checkStock not found" };
      return {
        result: {
          name: data.name,
          slug: data.slug,
          path: `/shop/${data.slug}`,
          stock: data.stock_quantity,
          inStock: data.stock_quantity > 0,
          lowStock: data.stock_quantity > 0 && data.stock_quantity <= data.low_stock_threshold,
        },
        logSummary: `checkStock ${data.slug}=${data.stock_quantity}`,
      };
    }

    case "getCategories": {
      const { data } = await supabase
        .from("categories")
        .select("name, slug, description")
        .order("name");
      return {
        result: { categories: data ?? [] },
        logSummary: `getCategories → ${(data ?? []).length}`,
      };
    }

    case "getOrderStatus": {
      const orderNumber = String(args.orderNumber ?? "").trim().toUpperCase();
      const email = String(args.email ?? "").trim().toLowerCase();
      if (!orderNumber || !email) {
        return {
          result: { error: "Order number and email are required" },
          logSummary: "getOrderStatus missing fields",
        };
      }

      const { data: order } = await supabase
        .from("orders")
        .select(
          "id, order_number, order_status, payment_status, payment_method, total, created_at, shipping_snapshot"
        )
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (!order) {
        return {
          result: { error: "Order not found" },
          logSummary: `getOrderStatus ${orderNumber} not found`,
        };
      }

      const snapshotEmail = (order.shipping_snapshot as any)?.email?.toLowerCase?.() ?? "";
      if (snapshotEmail !== email) {
        return {
          result: {
            error: "Order number and email do not match. Please check and try again.",
          },
          logSummary: `getOrderStatus email mismatch for ${orderNumber}`,
        };
      }

      return {
        result: {
          orderNumber: order.order_number,
          status: order.order_status,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method,
          total: order.total,
          placedAt: order.created_at,
        },
        logSummary: `getOrderStatus ${orderNumber}=${order.order_status}`,
      };
    }

    case "getCartGuidance": {
      const slugOrId = String(args.slugOrId ?? "").trim();
      const quantity = Math.max(1, Math.min(Number(args.quantity) || 1, 20));
      const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
      let q = supabase
        .from("products")
        .select(
          "id, name, slug, price, stock_quantity, product_images(url, sort_order), categories(name)"
        )
        .eq("is_published", true);
      q = isUuid ? q.eq("id", slugOrId) : q.eq("slug", slugOrId);
      const { data } = await q.maybeSingle();
      if (!data) {
        return { result: { error: "Product not found" }, logSummary: "getCartGuidance not found" };
      }

      const path = `/shop/${data.slug}`;
      const inStock = data.stock_quantity > 0;
      const maxQty = Math.min(quantity, data.stock_quantity || 0);

      return {
        result: {
          product: productCard(data),
          requestedQuantity: quantity,
          availableQuantity: data.stock_quantity,
          canAdd: inStock && maxQty > 0,
          steps: inStock
            ? [
                `Open the product page: ${path}`,
                `Click “Add to cart”${maxQty > 1 ? ` (quantity ${maxQty})` : ""}.`,
                "Open your cart from the header, then proceed to Checkout.",
                "At checkout you’ll choose gift card or Bitcoin payment and enter delivery details.",
              ]
            : [
                `This product is currently out of stock.`,
                `You can still view it at ${path} or ask me for in-stock alternatives.`,
              ],
          checkoutPath: "/checkout",
          cartPath: "/cart",
        },
        logSummary: `getCartGuidance ${data.slug} qty=${quantity} stock=${data.stock_quantity}`,
      };
    }

    case "escalateToHuman": {
      const reason = String(args.reason ?? "Customer requested human support").slice(0, 500);
      await supabase
        .from("conversations")
        .update({
          needs_human: true,
          ai_mode: "admin_takeover",
          escalated_at: new Date().toISOString(),
          status: "open",
        })
        .eq("id", context.conversationId);

      try {
        const { sendTelegramText } = await import("@/lib/telegram");
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        await sendTelegramText(
          `🚨 *AI Escalation*\nConversation needs human attention.\nReason: ${reason}\n\nOpen: ${siteUrl}/admin/messages/${context.conversationId}`
        );
      } catch {
        // non-fatal
      }

      return {
        result: {
          escalated: true,
          message:
            "A human team member has been notified and will reply as soon as possible.",
        },
        logSummary: `escalateToHuman: ${reason}`,
      };
    }

    case "getLowStockProducts": {
      const { getInventoryStats } = await import("@/lib/ai/inventory-agent");
      const stats = await getInventoryStats();
      const includeOos = args.includeOutOfStock !== false;
      return {
        result: {
          lowStock: stats.lowStock,
          outOfStock: includeOos ? stats.outOfStock : [],
          lowStockCount: stats.lowStockCount,
          outOfStockCount: includeOos ? stats.outOfStockCount : 0,
        },
        logSummary: `getLowStockProducts low=${stats.lowStockCount} oos=${stats.outOfStockCount}`,
      };
    }

    default:
      return {
        result: { error: `Unknown tool: ${name}` },
        logSummary: `unknown tool ${name}`,
      };
  }
}
