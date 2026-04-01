/**
 * useAuth — convenience wrapper around the auth store.
 */
import { useAuthStore } from "@/lib/store";

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth, updateUser } = useAuthStore();
  return { user, isAuthenticated, setAuth, clearAuth, updateUser };
}
