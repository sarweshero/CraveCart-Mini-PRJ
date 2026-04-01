import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Hotel, HotelAuthState } from "./types";

export const useHotelAuthStore = create<HotelAuthState>()(
  persist(
    (set) => ({
      hotel: null,
      token: null,
      isAuthenticated: false,

      setAuth: (hotel, token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("cravecart_hotel_token", token);
          document.cookie = `cravecart_hotel_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        }
        set({ hotel, token, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("cravecart_hotel_token");
          localStorage.removeItem("cravecart_hotel_refresh_token");
          document.cookie = "cravecart_hotel_token=; path=/; max-age=0";
        }
        set({ hotel: null, token: null, isAuthenticated: false });
      },

      updateHotel: (data) =>
        set((s) => ({ hotel: s.hotel ? { ...s.hotel, ...data } : null })),
    }),
    {
      name: "cravecart-hotel-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ hotel: s.hotel, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);
