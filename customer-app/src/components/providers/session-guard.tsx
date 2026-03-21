"use client";
/**
 * SessionGuard — listens for the "cravecart:session-expired" CustomEvent
 * fired by api.ts when a 401 + failed refresh occurs.
 * Clears auth state and redirects to /login gracefully.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    const handler = () => {
      clearAuth();
      router.push("/login?reason=session_expired");
    };
    window.addEventListener("cravecart:session-expired", handler);
    return () => window.removeEventListener("cravecart:session-expired", handler);
  }, [clearAuth, router]);

  return <>{children}</>;
}
