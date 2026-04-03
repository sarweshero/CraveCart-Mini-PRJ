"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Tag } from "lucide-react";
import { useAuthStore, useCartStore, useUIStore } from "@/lib/store";
import { calculateTax, cn, formatCurrency, isRemoteImageUrl } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export function CartDrawer() {
  const { isCartOpen, closeCart } = useUIStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const {
    items, restaurantName, appliedCoupon,
    updateQuantity, removeItem, removeCoupon,
    getSubtotal, getDeliveryFee, getTotal, getItemCount,
  } = useCartStore();

  const subtotal = getSubtotal();
  const delivery = getDeliveryFee();
  const taxes = calculateTax(subtotal);
  const platformFee = 5;
  const discount = appliedCoupon?.discount ?? 0;
  const total = getTotal();
  const count = getItemCount();

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-[#0C0B09] border-l border-[#2A2620] z-50 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2620]">
              <div>
                <h2 className="text-[#F5EDD8] font-display font-semibold text-lg">Your Cart</h2>
                {restaurantName && (
                  <p className="text-[#9E9080] text-xs mt-0.5 truncate max-w-[180px]">{restaurantName}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8A830]/15 text-[#E8A830] text-xs font-semibold">
                    {count} {count === 1 ? "item" : "items"}
                  </span>
                )}
                <button
                  onClick={closeCart}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9E9080] hover:text-[#F5EDD8] hover:bg-white/5 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-[#161410] border border-[#2A2620] flex items-center justify-center">
                    <ShoppingBag size={32} className="text-[#2A2620]" />
                  </div>
                  <div>
                    <p className="text-[#F5EDD8] font-medium">Your cart is empty</p>
                    <p className="text-[#9E9080] text-sm mt-1">Add items from a restaurant to get started</p>
                  </div>
                  <button
                    onClick={closeCart}
                    className="px-5 py-2.5 rounded-xl bg-[#E8A830] text-[#0C0B09] text-sm font-semibold hover:bg-[#F5C842] transition-colors"
                  >
                    Browse Restaurants
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-3 p-3 rounded-xl bg-[#161410] border border-[#2A2620]"
                    >
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item.menu_item.image}
                          alt={item.menu_item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized={isRemoteImageUrl(item.menu_item.image)}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[#F5EDD8] text-sm font-medium truncate">{item.menu_item.name}</p>
                        {item.customizations.length > 0 && (
                          <p className="text-[#9E9080] text-xs mt-0.5 truncate">
                            {item.customizations.join(", ")}
                          </p>
                        )}
                        <p className="text-[#E8A830] text-sm font-semibold mt-1">
                          {formatCurrency(item.item_total)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-[#9E9080] hover:text-[#F87171] transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-md bg-[#1E1B16] border border-[#2A2620] flex items-center justify-center text-[#BFB49A] hover:border-[#E8A830]/50 hover:text-[#E8A830] transition-all"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="text-[#F5EDD8] text-sm font-medium w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-md bg-[#1E1B16] border border-[#2A2620] flex items-center justify-center text-[#BFB49A] hover:border-[#E8A830]/50 hover:text-[#E8A830] transition-all"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Bill summary + CTA */}
            {items.length > 0 && (
              <div className="border-t border-[#2A2620] px-5 py-4 space-y-4 bg-[#0C0B09]">
                {/* Applied coupon */}
                {appliedCoupon && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#4ADE80]/10 border border-[#4ADE80]/20">
                    <div className="flex items-center gap-2">
                      <Tag size={13} className="text-[#4ADE80]" />
                      <span className="text-[#4ADE80] text-xs font-semibold">{appliedCoupon.code} applied</span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-[#9E9080] hover:text-[#F87171] transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Bill breakdown */}
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Subtotal", value: subtotal },
                    { label: "Delivery fee", value: delivery },
                    { label: "Platform fee", value: platformFee },
                    { label: "Taxes (5%)", value: taxes },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-[#9E9080]">
                      <span>{label}</span>
                      <span>{formatCurrency(value)}</span>
                    </div>
                  ))}
                  {discount > 0 && (
                    <div className="flex justify-between text-[#4ADE80]">
                      <span>Discount</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#2A2620] flex justify-between text-[#F5EDD8] font-semibold">
                    <span>Total</span>
                    <span className="text-[#E8A830]">{formatCurrency(total)}</span>
                  </div>
                </div>

                <Link
                  href={isAuthenticated ? "/checkout" : "/login?redirect=/checkout"}
                  onClick={closeCart}
                  className={cn(
                    "flex items-center justify-center gap-2 w-full py-3.5 rounded-xl",
                    "bg-[#E8A830] text-[#0C0B09] font-semibold text-sm",
                    "hover:bg-[#F5C842] transition-all active:scale-[0.98]",
                    "shadow-[0_0_20px_rgba(232,168,48,0.25)] hover:shadow-[0_0_30px_rgba(232,168,48,0.35)]"
                  )}
                >
                  {isAuthenticated ? "Proceed to Checkout" : "Sign In to Checkout"}
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
