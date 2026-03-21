"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Package, CheckCircle2, Clock, Truck, Home, X,
  Star, Send, Sparkles, Mail, RefreshCw, Phone, MapPin,
} from "lucide-react";
import { orderApi, reviewApi } from "@/lib/api";
import type { OrderDetail, TrackingStep } from "@/lib/types";
import { cn, formatCurrency, formatDate, formatTime, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";

const TRACK_ICONS = {
  placed: Package,
  confirmed: CheckCircle2,
  preparing: Clock,
  out_for_delivery: Truck,
  delivered: Home,
  cancelled: X,
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const data = await orderApi.get(id);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  // Poll for AI response if review submitted but no AI response yet
  useEffect(() => {
    if (!order?.review || order.review.ai_response) return;

    const poll = setInterval(async () => {
      const res = await reviewApi.getAiResponse(order.review!.id);
      if (res.status === "completed" && res.ai_response) {
        setOrder((prev) => prev ? {
          ...prev,
          review: { ...prev.review!, ai_response: res.ai_response! },
        } : prev);
        clearInterval(poll);
        toast.success("AI response received! 🤖✨");
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [order?.review?.id, order?.review?.ai_response]);

  if (loading) return <LoadingSkeleton />;
  if (!order) return <div className="flex items-center justify-center min-h-screen text-[#9E9080]">Order not found</div>;

  const currentStep = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"].indexOf(order.status);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-[#161410] border border-[#2A2620] flex items-center justify-center text-[#BFB49A] hover:text-[#F5EDD8] transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-[#F5EDD8] font-display font-semibold text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
              Order Details
            </h1>
            <p className="text-[#9E9080] text-sm mt-0.5">#{order.id} · {formatDate(order.placed_at)}</p>
          </div>
          <div className="ml-auto">
            <span className={cn("badge", getOrderStatusColor(order.status))}>
              {getOrderStatusLabel(order.status)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Order tracking */}
            {order.status !== "cancelled" && (
              <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
                <h2 className="text-[#F5EDD8] font-semibold mb-5">Order Tracking</h2>
                <div className="space-y-0">
                  {order.tracking.map((step, idx) => {
                    const Icon = TRACK_ICONS[step.status as keyof typeof TRACK_ICONS] ?? Package;
                    const isLast = idx === order.tracking.length - 1;
                    return (
                      <div key={step.status} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all",
                            step.completed
                              ? "bg-[#E8A830] border-[#E8A830] text-[#0C0B09]"
                              : "bg-transparent border-[#2A2620] text-[#9E9080]"
                          )}>
                            <Icon size={14} strokeWidth={2.5} />
                          </div>
                          {!isLast && (
                            <div className={cn(
                              "w-0.5 h-10 mt-1 transition-all",
                              step.completed ? "bg-[#E8A830]/40" : "bg-[#2A2620]"
                            )} />
                          )}
                        </div>
                        <div className="flex-1 pb-6 last:pb-0">
                          <div className="flex items-center justify-between">
                            <p className={cn(
                              "font-medium text-sm",
                              step.completed ? "text-[#F5EDD8]" : "text-[#9E9080]"
                            )}>
                              {step.label}
                            </p>
                            {step.time && (
                              <p className="text-[#9E9080] text-xs">{formatTime(step.time)}</p>
                            )}
                          </div>
                          <p className="text-[#9E9080] text-xs mt-0.5">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order items */}
            <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#2A2620]">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={order.restaurant.thumbnail} alt={order.restaurant.name} fill className="object-cover" sizes="40px" />
                </div>
                <div>
                  <h2 className="text-[#F5EDD8] font-semibold text-sm">{order.restaurant.name}</h2>
                  {order.restaurant.address && (
                    <p className="text-[#9E9080] text-xs flex items-center gap-1 mt-0.5">
                      <MapPin size={10} />
                      {order.restaurant.address}
                    </p>
                  )}
                </div>
                {order.restaurant.phone && (
                  <a href={`tel:${order.restaurant.phone}`} className="ml-auto w-8 h-8 rounded-lg bg-[#1E1B16] border border-[#2A2620] flex items-center justify-center text-[#9E9080] hover:text-[#E8A830] transition-colors">
                    <Phone size={14} />
                  </a>
                )}
              </div>

              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5EDD8] text-sm font-medium">{item.quantity}× {item.name}</p>
                      {item.customizations.length > 0 && (
                        <p className="text-[#9E9080] text-xs mt-0.5">{item.customizations.join(", ")}</p>
                      )}
                    </div>
                    <span className="text-[#BFB49A] text-sm font-medium flex-shrink-0">{formatCurrency(item.item_total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review section */}
            {order.status === "delivered" && (
              <div>
                {!order.review ? (
                  <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-[#F5EDD8] font-semibold">How was your order?</h2>
                    </div>
                    {!showReviewForm ? (
                      <div className="flex flex-col items-center py-4 gap-3 text-center">
                        <p className="text-[#9E9080] text-sm">Share your experience and get an AI-powered response from the restaurant!</p>
                        <button
                          onClick={() => setShowReviewForm(true)}
                          className="px-5 py-2.5 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm hover:bg-[#F5C842] transition-colors"
                        >
                          Write a Review
                        </button>
                      </div>
                    ) : (
                      <ReviewForm orderId={order.id} onSuccess={(review) => {
                        setOrder((prev) => prev ? { ...prev, review } : prev);
                        setShowReviewForm(false);
                      }} />
                    )}
                  </div>
                ) : (
                  <ReviewCard review={order.review} restaurantName={order.restaurant.name} />
                )}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Bill summary */}
            <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
              <h2 className="text-[#F5EDD8] font-semibold mb-4">Bill Summary</h2>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "Subtotal", value: formatCurrency(order.subtotal) },
                  { label: "Delivery fee", value: formatCurrency(order.delivery_fee) },
                  { label: "Platform fee", value: formatCurrency(order.platform_fee) },
                  { label: "Taxes", value: formatCurrency(order.taxes) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[#9E9080]">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
                {order.discount > 0 && (
                  <div className="flex justify-between text-[#4ADE80]">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[#2A2620] flex justify-between text-[#F5EDD8] font-semibold">
                  <span>Total Paid</span>
                  <span className="text-[#E8A830]">{formatCurrency(order.total)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#2A2620] space-y-2">
                <div className="flex justify-between text-xs text-[#9E9080]">
                  <span>Payment</span>
                  <span className="text-[#F5EDD8]">{order.payment_method}</span>
                </div>
                <div className="flex justify-between text-xs text-[#9E9080]">
                  <span>Status</span>
                  <span className={cn("font-medium", order.payment_status === "paid" ? "text-[#4ADE80]" : "text-[#F87171]")}>
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery address */}
            <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
              <h2 className="text-[#F5EDD8] font-semibold mb-3">Delivery Address</h2>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#E8A830]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Home size={13} className="text-[#E8A830]" />
                </div>
                <div>
                  <p className="text-[#F5EDD8] text-sm font-medium">{order.delivery_address.label}</p>
                  <p className="text-[#9E9080] text-xs mt-0.5 leading-relaxed">
                    {order.delivery_address.line1}
                    {order.delivery_address.line2 && `, ${order.delivery_address.line2}`}
                    <br />
                    {order.delivery_address.city}, {order.delivery_address.pincode}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Review Form ──

function ReviewForm({ orderId, onSuccess }: { orderId: string; onSuccess: (review: import("@/lib/types").Review) => void }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const PROMPTS: Record<number, string> = {
    1: "Sorry to hear that. What went wrong?",
    2: "Not great. What could be improved?",
    3: "It was okay. Any suggestions?",
    4: "Glad you liked it! What stood out?",
    5: "Wonderful! Tell us what made it great.",
  };

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    if (comment.trim().length < 10) { toast.error("Please write at least 10 characters"); return; }

    setSubmitting(true);
    try {
      const res = await reviewApi.submit({ order_id: orderId, rating, comment });
      toast.success("Review submitted! AI is crafting a response... ✨");
      onSuccess(res.review);
    } catch {
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Star rating */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHoveredRating(s)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(s)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={36}
                className={cn(
                  "transition-colors",
                  s <= (hoveredRating || rating)
                    ? "text-[#E8A830] fill-[#E8A830]"
                    : "text-[#2A2620] fill-[#2A2620]"
                )}
              />
            </button>
          ))}
        </div>
        {(hoveredRating || rating) > 0 && (
          <p className="text-[#9E9080] text-sm">{PROMPTS[hoveredRating || rating]}</p>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Describe your experience..."
        rows={4}
        className="w-full bg-[#1E1B16] border border-[#2A2620] rounded-xl px-4 py-3 text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/50 transition-colors resize-none"
      />

      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
          submitting || rating === 0
            ? "bg-[#2A2620] text-[#9E9080] cursor-not-allowed"
            : "bg-[#E8A830] text-[#0C0B09] hover:bg-[#F5C842] shadow-[0_0_20px_rgba(232,168,48,0.2)]"
        )}
      >
        {submitting ? (
          <>
            <RefreshCw size={15} className="animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send size={15} />
            Submit Review
          </>
        )}
      </button>

      <p className="text-[#9E9080] text-xs text-center">
        Your review will receive an AI-powered response from the restaurant, sent to your email.
      </p>
    </div>
  );
}

// ── Review + AI Response Card ──

function ReviewCard({ review, restaurantName }: { review: import("@/lib/types").Review; restaurantName: string }) {
  return (
    <div className="space-y-3">
      {/* User review */}
      <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
        <h2 className="text-[#F5EDD8] font-semibold mb-4">Your Review</h2>
        <div className="flex gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={16}
              className={cn(s <= review.rating ? "text-[#E8A830] fill-[#E8A830]" : "text-[#2A2620] fill-[#2A2620]")}
            />
          ))}
          <span className="text-[#9E9080] text-xs ml-2">{formatDate(review.created_at)}</span>
        </div>
        <p className="text-[#BFB49A] text-sm leading-relaxed">{review.comment}</p>
      </div>

      {/* AI response */}
      {!review.ai_response ? (
        <div className="bg-[#161410] border border-[#E8A830]/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-[#E8A830]/15 flex items-center justify-center">
              <Sparkles size={12} className="text-[#E8A830] animate-pulse" />
            </div>
            <span className="text-[#E8A830] text-sm font-medium">AI is crafting a response...</span>
          </div>
          <p className="text-[#9E9080] text-xs">
            {restaurantName} will receive your review and an AI-generated response will be sent to your email shortly.
          </p>
          <div className="flex gap-1.5 mt-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[#E8A830]/50 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1A1608] to-[#161410] border border-[#E8A830]/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(232,168,48,0.08)]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#E8A830]/20 border border-[#E8A830]/30 flex items-center justify-center">
                <Sparkles size={13} className="text-[#E8A830]" />
              </div>
              <div>
                <p className="text-[#E8A830] text-sm font-semibold">{restaurantName}</p>
                <p className="text-[#9E9080] text-[10px]">AI-crafted response · {formatDate(review.ai_response.generated_at)}</p>
              </div>
            </div>
            {review.ai_response.email_sent && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/20">
                <Mail size={11} className="text-[#4ADE80]" />
                <span className="text-[#4ADE80] text-[10px] font-semibold">Emailed</span>
              </div>
            )}
          </div>

          <p className="text-[#F5EDD8] text-sm leading-relaxed">{review.ai_response.text}</p>

          <div className="mt-3 pt-3 border-t border-[#2A2620] flex items-center gap-1.5">
            <Sparkles size={11} className="text-[#9E9080]" />
            <p className="text-[#9E9080] text-xs">Generated by Google Gemini AI on behalf of {restaurantName}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="skeleton h-10 w-64 rounded-xl mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
        <div className="space-y-5">
          {[...Array(2)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}
