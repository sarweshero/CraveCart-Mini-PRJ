import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionGuard } from "@/components/providers/session-guard";
import { VantaBackground } from "@/components/layout/vanta-background";

export const metadata: Metadata = {
  title: {
    default: "CraveCart — Food Delivered with Care",
    template: "%s | CraveCart",
  },
  description: "Order from the best restaurants in your city. Fresh food, fast delivery, and AI-powered feedback responses.",
  keywords: ["food delivery", "online food ordering", "restaurant", "biryani", "south indian"],
  authors: [{ name: "CraveCart" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: "CraveCart — Food Delivered with Care",
    description: "Order from the best restaurants in your city.",
  },
  icons: {
    icon: "/cravecart-logo.svg",
    shortcut: "/cravecart-logo.svg",
    apple: "/cravecart-logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C0B09",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased relative">
        <QueryProvider>
          <VantaBackground />
          <div className="relative z-10">
            <SessionGuard>
            {children}
            </SessionGuard>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#161410",
                color: "#F5EDD8",
                border: "1px solid #2A2620",
                borderRadius: "10px",
                fontFamily: "var(--font-plus-jakarta)",
                fontSize: "14px",
              },
              success: {
                iconTheme: { primary: "#4ADE80", secondary: "#161410" },
              },
              error: {
                iconTheme: { primary: "#F87171", secondary: "#161410" },
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
