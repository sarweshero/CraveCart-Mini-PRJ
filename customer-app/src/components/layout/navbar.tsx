"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Search, User, Menu, X, LogOut, Package, Heart } from "lucide-react";
import { useCartStore, useAuthStore, useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { getItemCount } = useCartStore();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { toggleCart, openSearch } = useUIStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const itemCount = getItemCount();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      toast.success("Logged out successfully");
      // Clear auth cookies
      document.cookie = "cravecart_token=; path=/; max-age=0";
      router.push("/login");
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/restaurants", label: "Restaurants" },
    { href: "/orders", label: "My Orders" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-[#100f0d]/88 backdrop-blur-xl border-b border-[#2A2620] shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
            : "bg-[#100f0d]/74 backdrop-blur-md border-b border-[#2A2620]/65"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <BrandLogo href="/" width={130} className="inline-flex shrink-0" />

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    pathname === link.href
                      ? "text-[#E8A830] bg-[#E8A830]/10"
                      : "text-[#BFB49A] hover:text-[#F5EDD8] hover:bg-white/5"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <button
              onClick={openSearch}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#BFB49A] hover:text-[#F5EDD8] hover:bg-white/5 transition-all"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Cart */}
            <button
              onClick={toggleCart}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#BFB49A] hover:text-[#F5EDD8] hover:bg-white/5 transition-all relative"
              aria-label="Cart"
            >
              <ShoppingBag size={18} />
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8A830] text-[#0C0B09] text-[10px] font-bold flex items-center justify-center"
                >
                  {itemCount > 9 ? "9+" : itemCount}
                </motion.span>
              )}
            </button>

            {/* Profile */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((p) => !p)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-[#E8A830]/20 border border-[#E8A830]/30 flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#E8A830] text-xs font-semibold">
                        {user?.name?.[0]?.toUpperCase() ?? "U"}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm text-[#F5EDD8] font-medium max-w-[100px] truncate">
                    {user?.name?.split(" ")[0]}
                  </span>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-[#161410]/78 backdrop-blur-xl border border-[#2A2620]/80 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.45)] overflow-hidden py-1 z-50"
                      onMouseLeave={() => setProfileOpen(false)}
                    >
                      <div className="px-4 py-3 border-b border-[#2A2620]">
                        <p className="text-[#F5EDD8] font-medium text-sm truncate">{user?.name}</p>
                        <p className="text-[#9E9080] text-xs truncate mt-0.5">{user?.email}</p>
                      </div>
                      {[
                        { href: "/profile", icon: User, label: "My Profile" },
                        { href: "/orders", icon: Package, label: "My Orders" },
                        { href: "/profile?tab=wishlist", icon: Heart, label: "Wishlist" },
                      ].map(({ href, icon: Icon, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#BFB49A] hover:text-[#F5EDD8] hover:bg-white/5 transition-colors"
                        >
                          <Icon size={15} />
                          {label}
                        </Link>
                      ))}
                      <div className="border-t border-[#2A2620] mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#F87171] hover:bg-[#F87171]/10 transition-colors"
                        >
                          <LogOut size={15} />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E8A830] text-[#0C0B09] text-sm font-semibold hover:bg-[#F5C842] transition-all shadow-[0_0_16px_rgba(232,168,48,0.2)] hover:shadow-[0_0_24px_rgba(232,168,48,0.3)] active:scale-[0.97]"
              >
                Sign In
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#BFB49A] hover:bg-white/5 transition-all"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-[#2A2620]/80 bg-[#100f0d]/92 backdrop-blur-xl"
            >
              <nav className="px-4 py-3 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      pathname === link.href
                        ? "text-[#E8A830] bg-[#E8A830]/10"
                        : "text-[#BFB49A] hover:text-[#F5EDD8]"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 px-4 py-3 rounded-lg bg-[#E8A830] text-[#0C0B09] text-sm font-semibold text-center"
                  >
                    Sign In
                  </Link>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  );
}
