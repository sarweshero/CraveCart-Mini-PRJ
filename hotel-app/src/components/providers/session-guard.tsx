"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHotelAuthStore } from "@/lib/store";

export function HotelSessionGuard({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const clearAuth = useHotelAuthStore((s) => s.clearAuth);

  useEffect(() => {
    const handler = () => {
      clearAuth();
      router.push("/login?reason=session_expired");
    };
    window.addEventListener("cravecart:hotel-session-expired", handler);
    return () => window.removeEventListener("cravecart:hotel-session-expired", handler);
  }, [clearAuth, router]);

  return <>{children}</>;
}
