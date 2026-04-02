"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { orderApi } from "@/lib/api";
import type { Order } from "@/lib/types";
import { cn, formatCurrency, formatRelativeDate, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import RestaurantMediaImage from "@/components/ui/RestaurantMediaImage";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.list().then(r => setOrders(r.results)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-[#F5EDD8] font-display font-semibold text-2xl sm:text-3xl tracking-tight mb-8">My Orders</h1>
      {loading ? (
        <div className="space-y-4">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#161410] border border-[#2A2620] flex items-center justify-center"><Package size={32} className="text-[#2A2620]"/></div>
          <p className="text-[#F5EDD8] font-semibold text-lg">No orders yet</p>
          <p className="text-[#9E9080] text-sm">Your order history will appear here</p>
          <Link href="/restaurants" className="px-6 py-3 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm hover:bg-[#F5C842] transition-all shadow-[0_0_20px_rgba(232,168,48,0.2)] active:scale-[0.97]">Browse Restaurants</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order=>(
            <Link key={order.id} href={`/orders/${order.id}`} className="group block">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#161410] border border-[#2A2620] hover:border-[#E8A830]/30 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <RestaurantMediaImage
                    src={order.restaurant.thumbnail}
                    alt={order.restaurant.name}
                    seed={`${order.restaurant.id}-${order.restaurant.name}`}
                    variant="card"
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[#F5EDD8] font-semibold text-sm truncate">{order.restaurant.name}</p>
                    <span className={cn("badge flex-shrink-0 text-[10px]", getOrderStatusColor(order.status))}>{getOrderStatusLabel(order.status)}</span>
                  </div>
                  <p className="text-[#9E9080] text-xs mt-0.5">{order.items_count} items · {formatCurrency(order.total)}</p>
                  <p className="text-[#9E9080] text-xs mt-0.5">{formatRelativeDate(order.placed_at)}</p>
                  {order.status === "delivered" && !order.has_review && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-[#E8A830]/10 border border-[#E8A830]/20 text-[#E8A830] text-[10px] font-semibold">Rate this order</span>
                  )}
                </div>
                <ChevronRight size={16} className="text-[#9E9080] group-hover:text-[#E8A830] transition-colors flex-shrink-0"/>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
