import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/components/providers/query-provider";
import { HotelSessionGuard } from "@/components/providers/session-guard";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: { default: "CraveCart Hotel Dashboard", template: "%s | CraveCart Hotel" },
  description: "Manage your restaurant orders, menu, and AI-powered review responses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
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
