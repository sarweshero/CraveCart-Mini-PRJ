"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed,
  Star, Sparkles, Settings, Tag, Power, Loader2, LogOut,
} from "lucide-react";
import { hotelAuthApi } from "@/lib/api";
import { useHotelAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { BrandLogo } from "@/components/brand/brand-logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: "/dashboard",                  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/dashboard/orders",           label: "Orders",       icon: ClipboardList   },
  { href: "/dashboard/menu",             label: "Menu",         icon: UtensilsCrossed },
  { href: "/dashboard/reviews",          label: "Reviews",      icon: Star            },
  { href: "/dashboard/ai-templates",     label: "AI Templates", icon: Sparkles        },
  { href: "/dashboard/coupons",          label: "Coupons",      icon: Tag             },
  { href: "/dashboard/settings",         label: "Settings",     icon: Settings        },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname            = usePathname();
  const router              = useRouter();
  const { hotel, updateHotel, clearAuth } = useHotelAuthStore();
  const [toggling, setToggling] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isOpen = hotel?.is_open ?? false;

  async function handleToggleOpen() {
    setToggling(true);
    try {
      const res = await hotelAuthApi.toggleOpen(!isOpen);
      updateHotel({ is_open: res.is_open });
      toast.success(res.is_open ? "Restaurant is now OPEN for orders 🟢" : "Restaurant is now CLOSED 🔴");
    } catch {
      toast.error("Failed to update restaurant status");
    } finally {
      setToggling(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await hotelAuthApi.logout();
    } finally {
      clearAuth();
      toast("Logged out successfully", { icon: "👋" });
      router.push("/login");
      setLoggingOut(false);
    }
  }

  return (
    <aside className="hidden w-72 shrink-0 border-r border-[var(--border)] bg-[var(--bg-card)] md:block">
      <div className="sticky top-0 flex h-screen flex-col p-5">
        {/* Header */}
        <div className="mb-6">
          <BrandLogo href="/dashboard" width={156} className="inline-flex mb-4" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
            CraveCart Hotel
          </p>
          <h1 className="font-display text-xl font-semibold text-[var(--text)] tracking-tight mt-1 truncate" style={{ fontFamily: "var(--font-fraunces, 'Fraunces', serif)" }}>
            {hotel?.restaurant_name ?? "Control Panel"}
          </h1>
        </div>

        {/* Restaurant Open/Closed Toggle */}
        <button
          onClick={handleToggleOpen}
          disabled={toggling}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl mb-5 border transition-all w-full",
            isOpen
              ? "bg-[#4ADE80]/10 border-[#4ADE80]/30 text-[#4ADE80] hover:bg-[#4ADE80]/15"
              : "bg-[#F87171]/10 border-[#F87171]/30 text-[#F87171] hover:bg-[#F87171]/15"
          )}
        >
          {toggling ? (
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          ) : (
            <Power className="h-4 w-4 flex-shrink-0" />
          )}
          <div className="flex-1 text-left">
            <div className="text-xs font-semibold uppercase tracking-wider">
              {isOpen ? "Open for Orders" : "Closed"}
            </div>
            <div className="text-[10px] opacity-70 mt-0.5">
              {isOpen ? "Click to close" : "Click to open"}
            </div>
          </div>
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", isOpen ? "bg-[#4ADE80] animate-pulse" : "bg-[#F87171]")} />
        </button>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon   = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? "active" : ""}`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[#F87171] hover:bg-[#F87171]/8 transition-all mt-4 w-full text-sm"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
