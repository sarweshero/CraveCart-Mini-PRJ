"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, TrendingUp, Clock, User, Wifi, WifiOff } from "lucide-react";
import { useDeliveryStore } from "@/lib/store";
import { getToken } from "@/lib/api";
import { BrandLogo } from "@/components/brand/brand-logo";

const NAV = [
  { href: "/home",     icon: Home,       label: "Home" },
  { href: "/earnings", icon: TrendingUp, label: "Earnings" },
  { href: "/history",  icon: Clock,      label: "History" },
  { href: "/profile",  icon: User,       label: "Profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { partner, isOnline } = useDeliveryStore();

  useEffect(() => {
    if (!getToken() && !partner) router.replace("/login");
  }, [partner, router]);

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-md border-b border-bg-border px-4 py-3 flex items-center justify-between">
        <div>
          <BrandLogo href="/home" width={124} className="inline-flex" />
          <div className="text-ink-muted text-xs mt-1">Delivery</div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOnline ? "bg-success/15 text-success" : "bg-ink-faint/15 text-ink-muted"}`}>
          {isOnline ? <><Wifi className="w-3 h-3" /> Online</> : <><WifiOff className="w-3 h-3" /> Offline</>}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-24">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-bg-card/95 backdrop-blur-md border-t border-bg-border px-2 py-2 z-50">
        <div className="flex">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = path.startsWith(href);
            return (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 relative">
                {active && <motion.div layoutId="nav-indicator" className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand rounded-full" />}
                <Icon className={`w-5 h-5 transition-colors ${active ? "text-brand" : "text-ink-faint"}`} strokeWidth={active ? 2.5 : 1.8} />
                <span className={`text-[10px] font-medium transition-colors ${active ? "text-brand" : "text-ink-faint"}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
