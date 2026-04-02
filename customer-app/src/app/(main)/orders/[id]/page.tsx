"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrderPolling } from "@/hooks/useOrderPolling";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Package, CheckCircle2, Clock, Truck, Home, X, Star, Send, Sparkles, Mail, RefreshCw, Phone, MapPin } from "lucide-react";
import { orderApi, reviewApi } from "@/lib/api";
import type { OrderDetail, OrderStatus, TrackingStep } from "@/lib/types";
import { cn, formatCurrency, formatDate, formatTime, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";
import RestaurantMediaImage from "@/components/ui/RestaurantMediaImage";

const TRACK_ICONS = { placed: Package, confirmed: CheckCircle2, preparing: Clock, out_for_delivery: Truck, delivered: Home, cancelled: X };
const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "cancelled"];
const POLL_INTERVAL_MS  = 8000;

export default function OrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get("payment");
  const [order, setOrder]           = useState<OrderDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [showPaymentBanner, setShowPaymentBanner] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating]         = useState(0);
  const [comment, setComment]       = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const loadOrder = useCallback(async () => {
    try {
      const data = await orderApi.get(id);
      setOrder(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => { loadOrder(); }, [loadOrder]);

  // Live polling via hook — stops automatically on terminal status
  useOrderPolling({
    id,
    enabled: !!order && !TERMINAL_STATUSES.includes(order?.status ?? ""),
    intervalMs: POLL_INTERVAL_MS,
    onUpdate: (fresh) => {
      setOrder(fresh);
      if (fresh.status === "delivered") toast.success("Your order has been delivered! 🎉");
    },
  });

  // Poll for AI response after review submission
  useEffect(() => {
    if (!order?.review || order.review.ai_response) return;
    const poll = setInterval(async () => {
      const res = await reviewApi.getAiResponse(String(order.review!.id));
      if (res.status === "completed" && res.ai_response) {
        setOrder(prev => prev ? { ...prev, review: { ...prev.review!, ai_response: res.ai_response! } } : prev);
        clearInterval(poll);
        toast.success("AI response received! 🤖✨");
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [order?.review?.id, order?.review?.ai_response]);

  const handleSubmitReview = async () => {
    if (!rating) { toast.error("Please select a rating"); return; }
    setSubmittingReview(true);
    try {
      await reviewApi.submit({ order_id: id, rating, comment: comment || undefined });
      toast.success("Review submitted! Thank you 🙏");
      setShowReviewForm(false);
      loadOrder();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit review");
    } finally { setSubmittingReview(false); }
  };

  if (loading) return <LoadingSkeleton />;
  if (!order)  return <div className="flex items-center justify-center min-h-screen text-[#9E9080]">Order not found</div>;

  const steps: OrderStatus[] = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"];
  const currentStep = steps.indexOf(order.status);
  const isTerminal  = TERMINAL_STATUSES.includes(order.status);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {showPaymentBanner && paymentResult === "success" && (
          <div className="mb-5 bg-[#4ADE80]/10 border border-[#4ADE80]/25 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <p className="text-[#4ADE80] text-sm font-medium">Payment successful. Your order is confirmed.</p>
            <button onClick={() => setShowPaymentBanner(false)} className="text-[#9E9080] hover:text-[#F5EDD8]">
              <X size={14} />
            </button>
          </div>
        )}

        {showPaymentBanner && paymentResult === "failed" && (
          <div className="mb-5 bg-[#F87171]/10 border border-[#F87171]/25 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <p className="text-[#FCA5A5] text-sm font-medium">Payment failed. The order is saved, and you can retry payment.</p>
            <button onClick={() => setShowPaymentBanner(false)} className="text-[#9E9080] hover:text-[#F5EDD8]">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-[#161410] border border-[#2A2620] flex items-center justify-center text-[#BFB49A] hover:text-[#F5EDD8] transition-all">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-[#F5EDD8] font-semibold text-xl">Order #{order.id.slice(-6).toUpperCase()}</h1>
            <p className="text-[#9E9080] text-sm">{formatDate(order.placed_at)}</p>
          </div>
          {!isTerminal && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-[#E8A830] bg-[#E8A830]/10 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E8A830] animate-pulse" />
              Live Tracking
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Status tracker */}
            {order.status !== "cancelled" && (
              <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[#F5EDD8] font-semibold">Order Status</h2>
                  {!isTerminal && (
                    <div className="flex items-center gap-1 text-[#9E9080] text-xs">
                      <RefreshCw size={11} className="animate-spin" /> Updates every 8s
                    </div>
                  )}
                </div>
                <div className="space-y-0">
                  {steps.map((s, i) => {
                    const tracking = order.tracking?.find((t: TrackingStep) => t.status === s);
                    const done   = i <= currentStep;
                    const active = i === currentStep;
                    const Icon   = TRACK_ICONS[s as keyof typeof TRACK_ICONS] ?? Package;
                    return (
                      <div key={s} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <motion.div animate={{ backgroundColor: done ? (active ? "#E8A830" : "#16A34A") : "#1E1B16", borderColor: done ? (active ? "#E8A830" : "#16A34A") : "#2A2620" }}
                            className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 relative">
                            <Icon size={15} className={done ? "text-[#0C0B09]" : "text-[#4B4542]"} />
                            {active && <span className="absolute inset-0 rounded-full border-2 border-[#E8A830] animate-ping opacity-60" />}
                          </motion.div>
                          {i < steps.length - 1 && <div className={cn("w-0.5 flex-1 my-1 min-h-[20px] rounded transition-all duration-700", i < currentStep ? "bg-green-600" : "bg-[#2A2620]")} />}
                        </div>
                        <div className="pb-4 flex-1">
                          <div className={cn("font-medium text-sm", done ? "text-[#F5EDD8]" : "text-[#4B4542]")}>
                            {getOrderStatusLabel(s)}
                            {active && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#E8A830]/15 text-[#E8A830] rounded-full uppercase tracking-wider">Now</span>}
                          </div>
                          {tracking?.time ? (
                            <p className="text-xs text-[#9E9080] mt-0.5">{formatTime(tracking.time)}</p>
                          ) : done ? null : (
                            <p className="text-xs text-[#4B4542] mt-0.5">Upcoming</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {order.status === "cancelled" && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center">
                <X size={32} className="text-red-400 mx-auto mb-2" />
                <h3 className="text-[#F5EDD8] font-semibold">Order Cancelled</h3>
                {order.cancellation_reason && <p className="text-[#9E9080] text-sm mt-1">{order.cancellation_reason}</p>}
              </div>
            )}

            {/* Restaurant info */}
            <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <RestaurantMediaImage
                    src={order.restaurant?.thumbnail}
                    alt={order.restaurant?.name ?? "Restaurant"}
                    seed={`${order.restaurant?.id ?? "order"}-${order.restaurant?.name ?? "restaurant"}`}
                    variant="card"
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[#F5EDD8] font-semibold">{order.restaurant?.name}</p>
                  {order.restaurant?.address && <p className="text-[#9E9080] text-xs mt-0.5 flex items-center gap-1"><MapPin size={10} /> {order.restaurant.address}</p>}
                </div>
                {order.restaurant?.phone && (
                  <a href={`tel:${order.restaurant.phone}`} className="w-9 h-9 rounded-xl bg-[#1E1B16] border border-[#2A2620] flex items-center justify-center text-[#9E9080] hover:text-[#E8A830] transition-colors">
                    <Phone size={15} />
                  </a>
                )}
              </div>
              <div className="space-y-2">
                {order.items?.map((item: { name: string; quantity: number; item_total: number }, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-[#BFB49A]">{item.quantity}× {item.name}</span>
                    <span className="text-[#9E9080]">{formatCurrency(item.item_total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review section */}
            {order.status === "delivered" && !order.has_review && !showReviewForm && (
              <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
                <p className="text-[#BFB49A] text-sm mb-3">How was your experience?</p>
                <button onClick={() => setShowReviewForm(true)} className="w-full py-3 rounded-xl bg-[#E8A830]/10 border border-[#E8A830]/30 text-[#E8A830] text-sm font-semibold hover:bg-[#E8A830]/20 transition-all flex items-center justify-center gap-2">
                  <Star size={14} /> Write a Review
                </button>
              </div>
            )}

            {showReviewForm && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#F5EDD8] font-semibold">Rate your order</h3>
                  <button onClick={() => setShowReviewForm(false)} className="text-[#9E9080] hover:text-[#BFB49A]"><X size={16} /></button>
                </div>
                <div className="flex gap-2 justify-center mb-4">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRating(s)}>
                      <Star size={36} className={cn("transition-all", s <= rating ? "text-[#E8A830] fill-[#E8A830] scale-110" : "text-[#4B4542] hover:text-[#E8A830]/50")} />
                    </button>
                  ))}
                </div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share details about your experience (optional)…" rows={3}
                  className="w-full bg-[#1E1B16] border border-[#2A2620] rounded-xl px-4 py-3 text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/50 transition-colors resize-none mb-3" />
                <button onClick={handleSubmitReview} disabled={submittingReview || !rating}
                  className="w-full py-3 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {submittingReview ? <><RefreshCw size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Submit Review</>}
                </button>
              </motion.div>
            )}

            {order.review?.ai_response && (
              <div className="bg-[#161410] border border-[#E8A830]/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={15} className="text-[#E8A830]" />
                  <h3 className="text-[#E8A830] font-semibold text-sm">AI Response from Restaurant</h3>
                  {order.review.ai_response.email_sent && <Mail size={13} className="text-[#9E9080] ml-auto" />}
                </div>
                <p className="text-[#BFB49A] text-sm leading-relaxed">{order.review.ai_response.text}</p>
              </div>
            )}
          </div>

          {/* Bill summary */}
          <div className="space-y-5">
            <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
              <h2 className="text-[#F5EDD8] font-semibold mb-4">Bill Details</h2>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "Subtotal",     value: order.subtotal },
                  { label: "Delivery Fee", value: order.delivery_fee },
                  { label: "Platform Fee", value: order.platform_fee },
                  { label: "Taxes",        value: order.taxes },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[#9E9080]">
                    <span>{label}</span><span>{formatCurrency(Number(value))}</span>
                  </div>
                ))}
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-[#4ADE80]">
                    <span>Coupon {order.coupon_code && `(${order.coupon_code})`}</span>
                    <span>-{formatCurrency(Number(order.discount))}</span>
                  </div>
                )}
                <div className="pt-2.5 border-t border-[#2A2620] flex justify-between font-semibold text-[#F5EDD8]">
                  <span>Total</span><span className="text-[#E8A830] text-base">{formatCurrency(Number(order.total))}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#2A2620]">
                <div className="flex items-center justify-between text-xs text-[#9E9080]">
                  <span>Payment</span>
                  <span className="text-[#BFB49A] font-medium uppercase">{order.payment_method}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#9E9080] mt-1">
                  <span>Status</span>
                  <span className={cn("font-medium", order.payment_status === "paid" ? "text-[#4ADE80]" : "text-[#E8A830]")}>
                    {order.payment_status === "paid" ? "✓ Paid" : order.payment_method === "cod" ? "Pay on delivery" : order.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {order.delivery_address && (
              <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
                <h2 className="text-[#F5EDD8] font-semibold mb-3">Delivery Address</h2>
                <p className="text-[#BFB49A] text-sm font-medium">{order.delivery_address.label}</p>
                <p className="text-[#9E9080] text-xs mt-1 leading-relaxed">
                  {order.delivery_address.line1}{order.delivery_address.line2 && `, ${order.delivery_address.line2}`}<br/>
                  {order.delivery_address.city}, {order.delivery_address.pincode}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-12 bg-[#161410] rounded-2xl mb-6 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-72 bg-[#161410] rounded-2xl" />
          <div className="h-40 bg-[#161410] rounded-2xl" />
        </div>
        <div className="h-64 bg-[#161410] rounded-2xl" />
      </div>
    </div>
  );
}
