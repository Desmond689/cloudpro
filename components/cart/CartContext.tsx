"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { CartLine, Product } from "@/lib/types";

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number, flavor?: string | null) => void;
  removeItem: (productId: string, flavor?: string | null) => void;
  setQuantity: (productId: string, quantity: number, flavor?: string | null) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "cloudra_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once on mount (client only — avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // corrupt/blocked storage — start empty rather than crash
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage full or blocked — cart just won't persist this session
    }
  }, [lines, hydrated]);

  // A cart line is identified by productId + flavor together — the same
  // product in two different flavors is two separate lines.
  function sameLine(l: CartLine, productId: string, flavor?: string | null) {
    return l.productId === productId && (l.flavor ?? null) === (flavor ?? null);
  }

  const addItem = useCallback((product: Product, quantity = 1, flavor: string | null = null) => {
    setLines((prev) => {
      const existing = prev.find((l) => sameLine(l, product.id, flavor));
      const image = product.product_images?.[0]?.url ?? null;
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, product.stock_quantity || 99);
        return prev.map((l) => (sameLine(l, product.id, flavor) ? { ...l, quantity: nextQty } : l));
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image,
          quantity: Math.min(quantity, product.stock_quantity || 99),
          stock_quantity: product.stock_quantity,
          flavor: flavor ?? null,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: string, flavor: string | null = null) => {
    setLines((prev) => prev.filter((l) => !sameLine(l, productId, flavor)));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number, flavor: string | null = null) => {
    setLines((prev) =>
      prev
        .map((l) => (sameLine(l, productId, flavor) ? { ...l, quantity: Math.max(1, quantity) } : l))
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);

  return (
    <CartContext.Provider value={{ lines, itemCount, subtotal, addItem, removeItem, setQuantity, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
