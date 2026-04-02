"use client";

import { useState } from "react";
import { useHotelOrders } from "@/hooks/useHotelOrders";
import { motion } from "framer-motion";
import { Clock, Phone, MapPin, ChevronRight, RefreshCw } from "lucide-react";
import { hotelOrderApi } from "@/lib/api";
import { cn, formatCurrency, formatRelative, STATUS_LABELS, STATUS_TRANSITIONS, STATUS_NEXT_LABEL, type OrderStatus } from "@/lib/utils";
import toast from "react-hot-toast";

interface HotelOrder {
  id: string;
  customer: { name: string; phone: string; avatar: string };
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  placed_at: string;
  delivery_address: string;
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "placed", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { orders, loading, reload: loadOrders } = useHotelOrders(activeTab);

  const handleStatusUpdate = async (order: HotelOrder) => {
    const next = STATUS_TRANSITIONS[order.status];
    if (!next) return;
    setUpdatingId(order.id);
    try {
      await hotelOrderApi.updateStatus(order.id, next);
      await loadOrders();
      toast.success(`Order marked as ${STATUS_LABELS[next]}`);
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const newCount = orders.filter((o) => o.status === "placed").length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[#FAFAFA] font-display font-semibold text-3xl mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            Orders
          </h1>
          <p className="text-[#71717A] text-sm">Manage incoming and active orders</p>
        </div>
        <button
          onClick={() => loadOrders()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111113] border border-[#27272A] text-[#A1A1AA] text-sm hover:text-[#FAFAFA] transition-all"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* New orders alert */}
      {newCount > 0 && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#FBBF24]/10 border border-[#FBBF24]/20 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] animate-ping" />
          <span className="text-[#FBBF24] text-sm font-semibold">
            {newCount} new order{newCount > 1 ? "s" : ""} waiting for confirmation!
          </span>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#111113] border border-[#27272A] mb-6 overflow-x-auto">
        {STATUS_TABS.map(({ value, label }) => {
          const count = value === "all" ? orders.length : orders.filter((o) => o.status === value).length;
          return (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                activeTab === value ? "bg-[#7C3AED] text-white" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  activeTab === value ? "bg-white/20" : "bg-[#27272A] text-[#71717A]"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(4).fill(null).map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-[#71717A]">No orders in this category.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-[#111113] border rounded-2xl overflow-hidden transition-all",
                order.status === "placed" ? "border-[#FBBF24]/30" : "border-[#27272A]"
              )}
            >
              {/* Header */}
              <div className={cn(
                "px-5 py-3 flex items-center justify-between",
                order.status === "placed" ? "bg-[#FBBF24]/5" : "bg-transparent"
              )}>
                <div>
                  <p className="text-[#71717A] text-xs font-mono">#{order.id.slice(-8).toUpperCase()}</p>
                  <p className="text-[#FAFAFA] font-semibold text-sm">{order.customer.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span>
                  <a href={`tel:${order.customer.phone}`} className="w-7 h-7 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] hover:text-[#4ADE80] transition-colors">
                    <Phone size={12} />
                  </a>
                </div>
              </div>

              {/* Items */}
              <div className="px-5 py-3 border-y border-[#27272A]/50">
                <div className="space-y-1.5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-[#A1A1AA]">{item.quantity}× {item.name}</span>
                      <span className="text-[#A1A1AA]">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-semibold text-[#FAFAFA] mt-2 pt-2 border-t border-[#27272A]">
                  <span>Total</span>
                  <span className="text-[#7C3AED]">{formatCurrency(order.total)}</span>
                </div>
              </div>

              {/* Meta */}
              <div className="px-5 py-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
                  <Clock size={11} />
                  <span>Placed {formatRelative(order.placed_at)}</span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-[#71717A]">
                  <MapPin size={11} className="mt-0.5 flex-shrink-0" />
                  <span className="truncate">{order.delivery_address}</span>
                </div>
              </div>

              {/* Action button */}
              {STATUS_TRANSITIONS[order.status] && (
                <div className="px-5 py-3 border-t border-[#27272A]">
                  <button
                    onClick={() => handleStatusUpdate(order)}
                    disabled={updatingId === order.id}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                      order.status === "placed"
                        ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                        : "bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#7C3AED]/40"
                    )}
                  >
                    {updatingId === order.id ? (
                      <><RefreshCw size={13} className="animate-spin" />Updating...</>
                    ) : (
                      <>{STATUS_NEXT_LABEL[order.status]} <ChevronRight size={13} /></>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
