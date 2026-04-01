/**
 * useHotelAuth — convenience wrapper for hotel auth store.
 */
import { useHotelAuthStore } from "@/lib/store";

export function useHotelAuth() {
  const { hotel, token, isAuthenticated, setAuth, clearAuth, updateHotel } = useHotelAuthStore();
  return { hotel, token, isAuthenticated, setAuth, clearAuth, updateHotel };
}
