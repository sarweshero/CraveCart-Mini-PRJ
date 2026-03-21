import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider }
import { HotelSessionGuard } from "@/components/providers/session-guard" from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: { default: "CraveCart Hotel Dashboard", template: "%s | CraveCart Hotel" },
  description: "Manage your restaurant orders, menu, and AI-powered review responses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <HotelSessionGuard>
          {children}
          </HotelSessionGuard>
          <Toaster position="bottom-right" toastOptions={{ style: { background: "#FFFFFF", color: "#1C1917", border: "1px solid #E7E5E0", borderRadius: "10px", fontSize: "14px" }, success: { iconTheme: { primary: "#16A34A", secondary: "#FFFFFF" } }, error: { iconTheme: { primary: "#DC2626", secondary: "#FFFFFF" } } }} />
        </QueryProvider>
      </body>
    </html>
  );
}
