"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, TrendingUp, Star, MessageSquare,
  ArrowUp, ArrowDown, Clock, Zap,
} from "lucide-react";
import { dashboardApi, hotelOrderApi } from "@/lib/api";
import { formatCurrency, formatRelative, STATUS_LABELS, cn, type OrderStatus } from "@/lib/utils";
import { useHotelAuthStore } from "@/lib/store";

interface DashboardStats {
  today: { orders: number; revenue: number; avg_order_value: number; new_reviews: number };
  this_week: { orders: number; revenue: number; avg_order_value: number; reviews: number };
  this_month: { orders: number; revenue: number; avg_order_value: number; reviews: number };
  rating_overview: { average: number; total: number; breakdown: Record<string, number> };
  recent_orders: Array<{
    id: string; customer_name: string; items: string[];
    total: number; status: string; placed_at: string;
  }>;
}

const stagger = { visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function DashboardPage() {
  const { hotel } = useHotelAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "this_week" | "this_month">("today");

  useEffect(() => {
    dashboardApi.stats().then((data) => setStats(data as DashboardStats)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const periodData = stats?.[period];
  const reviewCount = periodData
    ? ("new_reviews" in periodData ? periodData.new_reviews : periodData.reviews)
    : 0;

  const statCards = periodData ? [
    {
      label: "Total Orders",
      value: periodData.orders,
      icon: ShoppingBag,
      color: "#7C3AED",
      bg: "rgba(124,58,237,0.1)",
      change: +12,
    },
    {
      label: "Revenue",
      value: formatCurrency(periodData.revenue),
      icon: TrendingUp,
      color: "#4ADE80",
      bg: "rgba(74,222,128,0.1)",
      change: +8,
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(periodData.avg_order_value),
      icon: Zap,
      color: "#FBBF24",
      bg: "rgba(251,191,36,0.1)",
      change: +3,
    },
    {
      label: "New Reviews",
      value: reviewCount,
      icon: MessageSquare,
      color: "#60A5FA",
      bg: "rgba(96,165,250,0.1)",
      change: +18,
    },
  ] : [];

  const breakdown = stats?.rating_overview.breakdown ?? {};
  const totalReviews = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-7xl">
      {/* Greeting */}
      <motion.div initial="hidden" animate="visible" variants={stagger} className="mb-8">
        <motion.div variants={fadeUp}>
          <h1
            className="text-[#FAFAFA] font-display font-semibold text-3xl mb-1"
            style={{ fontFamily: "var(--font-fraunces, 'Fraunces', serif)" }}
          >
            Good morning, {hotel?.owner_name?.split(" ")[0] ?? "Chef"} 👋
          </h1>
          <p className="text-[#71717A] text-sm">{hotel?.restaurant_name} · Live dashboard</p>
        </motion.div>
      </motion.div>

      {/* Period selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#111113] border border-[#27272A] w-fit mb-6">
        {(["today", "this_week", "this_month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              period === p ? "bg-[#7C3AED] text-white" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
            )}
          >
            {p === "today" ? "Today" : p === "this_week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {loading
          ? Array(4).fill(null).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)
          : statCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} variants={fadeUp}>
                <div className="p-5 rounded-2xl bg-[#111113] border border-[#27272A] hover:border-[#27272A]/80 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                      <Icon size={16} style={{ color: card.color }} />
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-semibold",
                      card.change >= 0 ? "text-[#4ADE80]" : "text-[#F87171]"
                    )}>
                      {card.change >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      {Math.abs(card.change)}%
                    </div>
                  </div>
                  <p className="text-[#FAFAFA] font-bold text-2xl leading-none mb-1">{card.value}</p>
                  <p className="text-[#71717A] text-xs">{card.label}</p>
                </div>
              </motion.div>
            );
          })
        }
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A]">
              <h2 className="text-[#FAFAFA] font-semibold text-sm">Live Orders</h2>
              <a href="/dashboard/orders" className="text-[#7C3AED] text-xs hover:underline">View all →</a>
            </div>
            <div className="divide-y divide-[#27272A]">
              {loading
                ? Array(4).fill(null).map((_, i) => <div key={i} className="skeleton h-16 m-4 rounded-xl" />)
                : stats?.recent_orders.map((order) => (
                  <div key={order.id} className="flex items-start gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[#FAFAFA] text-sm font-medium">{order.customer_name}</p>
                        <span className={`badge badge-${order.status}`}>
                          {STATUS_LABELS[order.status as OrderStatus]}
                        </span>
                      </div>
                      <p className="text-[#71717A] text-xs mt-0.5 truncate">{order.items.join(", ")}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#71717A]">
                        <span className="flex items-center gap-1"><Clock size={10} />{formatRelative(order.placed_at)}</span>
                        <span className="text-[#A1A1AA] font-medium">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Rating breakdown */}
        <div>
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#27272A]">
              <h2 className="text-[#FAFAFA] font-semibold text-sm">Rating Overview</h2>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="skeleton h-40 rounded-xl" />
              ) : (
                <>
                  <div className="flex items-end gap-3 mb-5">
                    <span
                      className="text-[#FAFAFA] font-display font-bold text-5xl leading-none"
                      style={{ fontFamily: "var(--font-fraunces, serif)" }}
                    >
                      {stats?.rating_overview.average}
                    </span>
                    <div className="pb-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={s <= Math.round(stats?.rating_overview.average ?? 0) ? "text-[#FBBF24] fill-[#FBBF24]" : "text-[#27272A] fill-[#27272A]"}
                          />
                        ))}
                      </div>
                      <p className="text-[#71717A] text-xs mt-1">{stats?.rating_overview.total.toLocaleString()} reviews</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = breakdown[star.toString()] ?? 0;
                      const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-[#71717A] text-xs w-3">{star}</span>
                          <Star size={11} className="text-[#FBBF24] fill-[#FBBF24] flex-shrink-0" />
                          <div className="flex-1 h-1.5 rounded-full bg-[#27272A] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#FBBF24] transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[#71717A] text-xs w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
