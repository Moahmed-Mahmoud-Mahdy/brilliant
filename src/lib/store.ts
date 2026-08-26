"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CustomerDTO } from "./types";

// ─── Cart store (persisted to localStorage) ───

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (skuId: string, quantity: number) => void;
  removeItem: (skuId: string) => void;
  setItems: (items: CartItem[]) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.skuId === item.skuId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.skuId === item.skuId
                  ? {
                      ...i,
                      quantity: Math.min(i.quantity + item.quantity, item.maxQuantity),
                    }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      updateQuantity: (skuId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.skuId === skuId
                ? { ...i, quantity: Math.min(Math.max(1, quantity), i.maxQuantity) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      removeItem: (skuId) =>
        set((state) => ({ items: state.items.filter((i) => i.skuId !== skuId) })),
      setItems: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "brilliant-cart",
      // Defer localStorage rehydration until after mount to avoid SSR
      // hydration mismatches (server always renders an empty cart).
      skipHydration: true,
    }
  )
);

// ─── Customer auth store ───

interface AuthState {
  customer: CustomerDTO | null;
  loading: boolean;
  setCustomer: (customer: CustomerDTO | null) => void;
  load: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  customer: null,
  loading: true,
  setCustomer: (customer) => set({ customer, loading: false }),
  load: async () => {
    try {
      const { api } = await import("./api");
      const { customer } = await api.auth.me();
      set({ customer, loading: false });
    } catch {
      set({ customer: null, loading: false });
    }
  },
  logout: async () => {
    try {
      const { api } = await import("./api");
      await api.auth.logout();
    } catch {
      // ignore
    }
    set({ customer: null });
  },
}));

// ─── Admin auth store ───

interface AdminAuthState {
  admin: { id: string; name: string; username: string } | null;
  loading: boolean;
  setAdmin: (admin: { id: string; name: string; username: string } | null) => void;
  load: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAdminStore = create<AdminAuthState>((set) => ({
  admin: null,
  loading: true,
  setAdmin: (admin) => set({ admin, loading: false }),
  load: async () => {
    try {
      const { api } = await import("./api");
      const { admin } = await api.admin.me();
      set({ admin, loading: false });
    } catch {
      set({ admin: null, loading: false });
    }
  },
  logout: async () => {
    try {
      const { api } = await import("./api");
      await api.admin.logout();
    } catch {
      // ignore
    }
    set({ admin: null });
  },
}));

// ─── Cart totals helper ───

export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );
  const totalBase = items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const savings = totalBase - subtotal;
  return { subtotal, count, savings };
}
