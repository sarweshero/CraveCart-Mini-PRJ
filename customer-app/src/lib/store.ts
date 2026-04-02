// ============================================================
// CraveCart — Zustand Stores
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, CartItem } from "./types";
import { calculateTax, roundMoney } from "./utils";

// ─────────────────────────────────────────────────────────────
// Cart Store
// ─────────────────────────────────────────────────────────────

interface CartStoreItem extends CartItem {
  restaurantId: string;
  restaurantName: string;
}

interface ConflictPending {
  item: CartItem;
  restaurantId: string;
  restaurantName: string;
}

interface CartState {
  items: CartStoreItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  appliedCoupon: { code: string; discount: number } | null;
  // Conflict state — set when user tries to add item from a different restaurant
  conflictPending: ConflictPending | null;

  // Actions
  addItem: (item: CartItem, restaurantId: string, restaurantName: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  clearConflict: () => void;
  clearCartAndAdd: (item: CartItem, restaurantId: string, restaurantName: string) => void;

  // Selectors
  getSubtotal: () => number;
  getItemCount: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
  hasItem: (menuItemId: string) => boolean;
  getItemQuantity: (menuItemId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      restaurantName: null,
      appliedCoupon: null,
      conflictPending: null,

      addItem: (item, restaurantId, restaurantName) => {
        const state = get();

        // If cart belongs to different restaurant, set conflict state.
        // CartConflictListener in the layout will show the dialog.
        if (state.restaurantId && state.restaurantId !== restaurantId) {
          set({ conflictPending: { item, restaurantId, restaurantName } });
          return;
        }

        const existing = state.items.find((i) => i.menu_item.id === item.menu_item.id);
        if (existing) {
          set((s) => ({
            items: s.items.map((i) =>
              i.menu_item.id === item.menu_item.id
                ? { ...i, quantity: i.quantity + item.quantity, item_total: (i.quantity + item.quantity) * i.menu_item.price }
                : i
            ),
          }));
        } else {
          set((s) => ({
            items: [...s.items, { ...item, restaurantId, restaurantName }],
            restaurantId,
            restaurantName,
          }));
        }
      },

      removeItem: (itemId) => {
        set((s) => {
          const items = s.items.filter((i) => i.id !== itemId);
          return {
            items,
            restaurantId: items.length === 0 ? null : s.restaurantId,
            restaurantName: items.length === 0 ? null : s.restaurantName,
          };
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((s) => ({
          items: s.items.map((i) =>
            i.id === itemId
              ? { ...i, quantity, item_total: quantity * i.menu_item.price }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [], restaurantId: null, restaurantName: null, appliedCoupon: null, conflictPending: null }),

      applyCoupon: (code, discount) => set({ appliedCoupon: { code, discount } }),
      removeCoupon: () => set({ appliedCoupon: null }),

      clearConflict: () => set({ conflictPending: null }),

      clearCartAndAdd: (item, restaurantId, restaurantName) => {
        // Clear old cart, apply new restaurant, add the item
        const cartItem: CartStoreItem = { ...item, restaurantId, restaurantName };
        set({
          items: [cartItem],
          restaurantId,
          restaurantName,
          appliedCoupon: null,
          conflictPending: null,
        });
      },

      getSubtotal: () => get().items.reduce((acc, i) => acc + i.item_total, 0),
      getItemCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      getDeliveryFee: () => (get().items.length === 0 ? 0 : 30),

      getTotal: () => {
        const state = get();
        const subtotal = state.getSubtotal();
        const delivery = state.getDeliveryFee();
        const discount = state.appliedCoupon?.discount ?? 0;
        const taxes = calculateTax(subtotal);
        const platform = 5;
        return roundMoney(Math.max(0, subtotal + delivery + taxes + platform - discount));
      },

      hasItem: (menuItemId) => get().items.some((i) => i.menu_item.id === menuItemId),

      getItemQuantity: (menuItemId) => {
        const item = get().items.find((i) => i.menu_item.id === menuItemId);
        return item?.quantity ?? 0;
      },
    }),
    {
      name: "cravecart-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ─────────────────────────────────────────────────────────────
// Auth Store
// ─────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("cravecart_token", token);
          document.cookie = `cravecart_token=${token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `cravecart_profile_complete=${user.is_profile_complete}; path=/; max-age=86400; SameSite=Lax`;
        }
        set({ user, token, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("cravecart_token");
          localStorage.removeItem("cravecart_refresh_token");
          document.cookie = "cravecart_token=; path=/; max-age=0";
          document.cookie = "cravecart_profile_complete=; path=/; max-age=0";
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((s) => ({
          user: s.user ? { ...s.user, ...updates } : null,
        })),
    }),
    {
      name: "cravecart-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);

// ─────────────────────────────────────────────────────────────
// UI Store
// ─────────────────────────────────────────────────────────────

interface UIState {
  isCartOpen: boolean;
  isSearchOpen: boolean;
  isMobileMenuOpen: boolean;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCartOpen: false,
  isSearchOpen: false,
  isMobileMenuOpen: false,

  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
}));
