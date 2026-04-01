import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeliveryPartner } from "./api";

interface DeliveryStore {
  partner: DeliveryPartner | null;
  isOnline: boolean;
  setPartner: (p: DeliveryPartner | null) => void;
  setOnline: (v: boolean) => void;
  clearAuth: () => void;
}

export const useDeliveryStore = create<DeliveryStore>()(
  persist(
    (set) => ({
      partner: null, isOnline: false,
      setPartner: (p) => set({ partner: p, isOnline: p?.is_online ?? false }),
      setOnline: (v) => set(s => ({ isOnline: v, partner: s.partner ? { ...s.partner, is_online: v } : null })),
      clearAuth: () => set({ partner: null, isOnline: false }),
    }),
    { name: "cravecart-delivery-store" }
  )
);
