"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDeliveryStore } from "@/lib/store";
import { clearTokens } from "@/lib/api";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 20_000 } } });

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { clearAuth } = useDeliveryStore();
  useEffect(() => {
    const handler = () => { clearAuth(); clearTokens(); router.push("/login?reason=session_expired"); };
    window.addEventListener("cravecart:delivery-session-expired", handler);
    return () => window.removeEventListener("cravecart:delivery-session-expired", handler);
  }, [clearAuth, router]);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" toastOptions={{
        style: { background: "#111318", color: "#F1EDE4", border: "1px solid #1F2430", borderRadius: "12px" },
        success: { iconTheme: { primary: "#22C55E", secondary: "#111318" } },
        error: { iconTheme: { primary: "#EF4444", secondary: "#111318" } },
      }} />
    </QueryClientProvider>
  );
}
