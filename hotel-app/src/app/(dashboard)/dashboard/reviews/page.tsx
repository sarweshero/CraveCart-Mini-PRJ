"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Sparkles, Mail, RefreshCw, ChevronDown, ChevronUp,
  Send, Clock, CheckCircle2, AlertCircle, Filter,
} from "lucide-react";
import { hotelReviewApi, templateApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface AIResponse { id: string; text: string; generated_at: string; email_sent: boolean; template_used?: string; }
interface Review {
  id: string; order_id: string;
  customer: { name: string; email: string; avatar: string };
  rating: number; comment: string; created_at: string;
  ai_response: AIResponse | null;
}
interface Template { id: string; name: string; is_active: boolean; }

const RATING_FILTER = [
  { value: "all", label: "All" },
  { value: "5", label: "⭐⭐⭐⭐⭐" },
  { value: "4", label: "⭐⭐⭐⭐" },
  { value: "3", label: "⭐⭐⭐" },
  { value: "1-2", label: "⭐ & ⭐⭐" },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [respondedFilter, setRespondedFilter] = useState<"all" | "pending" | "responded">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([hotelReviewApi.list(), templateApi.list()]).then(([revData, tmplData]) => {
      setReviews((revData as { results: Review[] }).results);
      setTemplates(tmplData as Template[]);
    }).finally(() => setLoading(false));
  }, []);

  const activeTemplate = templates.find((t) => t.is_active);

  const filtered = reviews.filter((r) => {
    if (ratingFilter !== "all") {
      if (ratingFilter === "1-2") { if (r.rating > 2) return false; }
      else { if (r.rating !== parseInt(ratingFilter)) return false; }
    }
    if (respondedFilter === "pending" && r.ai_response) return false;
    if (respondedFilter === "responded" && !r.ai_response) return false;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.ai_response).length;

  const handleGenerateAI = async (review: Review) => {
    setGeneratingId(review.id);
    try {
      const res = await hotelReviewApi.generateAiResponse(review.id, activeTemplate?.id);
      setReviews((prev) => prev.map((r) =>
        r.id === review.id ? { ...r, ai_response: (res as { ai_response: AIResponse }).ai_response } : r
      ));
      setExpandedId(review.id);
      toast.success("AI response generated! ✨");
    } catch {
      toast.error("Failed to generate AI response");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSendEmail = async (review: Review) => {
    if (!review.ai_response) return;
    setSendingId(review.id);
    try {
      await hotelReviewApi.sendAiResponse(review.id, review.ai_response.id);
      setReviews((prev) => prev.map((r) =>
        r.id === review.id && r.ai_response
          ? { ...r, ai_response: { ...r.ai_response, email_sent: true } }
          : r
      ));
      toast.success("Email sent to customer! 📧");
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[#FAFAFA] font-display font-semibold text-3xl mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          Reviews & AI Responses
        </h1>
        <p className="text-[#71717A] text-sm">
          Manage customer reviews. Generate AI-powered responses using your custom template.
        </p>
      </div>

      {/* Active template indicator */}
      {activeTemplate && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 mb-6">
          <Sparkles size={15} className="text-[#A78BFA]" />
          <span className="text-[#A78BFA] text-sm">
            Active template: <strong>{activeTemplate.name}</strong> — AI responses use this tone.
          </span>
          <a href="/dashboard/ai-templates" className="ml-auto text-[#7C3AED] text-xs hover:underline">Change →</a>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Reviews", value: reviews.length, color: "#FAFAFA" },
          { label: "Pending Response", value: pendingCount, color: "#FBBF24" },
          { label: "Responded", value: reviews.length - pendingCount, color: "#4ADE80" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111113] border border-[#27272A] rounded-2xl px-5 py-4">
            <p className="text-[#71717A] text-xs mb-1">{label}</p>
            <p className="font-bold text-2xl" style={{ color }}>{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-xl bg-[#111113] border border-[#27272A]">
          {(["all", "pending", "responded"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setRespondedFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                respondedFilter === f ? "bg-[#7C3AED] text-white" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              )}
            >
              {f === "all" ? "All" : f === "pending" ? `Pending (${pendingCount})` : "Responded"}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-[#111113] border border-[#27272A]">
          {RATING_FILTER.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRatingFilter(value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                ratingFilter === value ? "bg-[#FBBF24] text-[#09090B]" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4">
          {Array(4).fill(null).map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#71717A]">No reviews match the current filter.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              expanded={expandedId === review.id}
              onToggle={() => setExpandedId(expandedId === review.id ? null : review.id)}
              onGenerate={() => handleGenerateAI(review)}
              onSend={() => handleSendEmail(review)}
              generating={generatingId === review.id}
              sending={sendingId === review.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Review Card ──

function ReviewCard({
  review, expanded, onToggle, onGenerate, onSend, generating, sending,
}: {
  review: Review;
  expanded: boolean;
  onToggle: () => void;
  onGenerate: () => void;
  onSend: () => void;
  generating: boolean;
  sending: boolean;
}) {
  const hasAI = !!review.ai_response;
  const emailSent = review.ai_response?.email_sent;

  const ratingBg =
    review.rating >= 4 ? "rgba(74,222,128,0.08)" :
    review.rating === 3 ? "rgba(251,191,36,0.08)" :
    "rgba(248,113,113,0.08)";

  const ratingBorder =
    review.rating >= 4 ? "rgba(74,222,128,0.2)" :
    review.rating === 3 ? "rgba(251,191,36,0.2)" :
    "rgba(248,113,113,0.2)";

  return (
    <motion.div
      layout
      className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden"
      style={{ borderColor: hasAI ? "rgba(124,58,237,0.2)" : "#27272A" }}
    >
      {/* Main row */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-sm font-bold text-[#A78BFA] flex-shrink-0">
            {review.customer.name[0]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-[#FAFAFA] font-medium text-sm">{review.customer.name}</p>
                <p className="text-[#71717A] text-xs">{review.customer.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Status badges */}
                {emailSent ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/20 text-[#4ADE80] text-[10px] font-semibold">
                    <CheckCircle2 size={10} /> Email Sent
                  </span>
                ) : hasAI ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A78BFA] text-[10px] font-semibold">
                    <Sparkles size={10} /> AI Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#FBBF24]/10 border border-[#FBBF24]/20 text-[#FBBF24] text-[10px] font-semibold">
                    <AlertCircle size={10} /> Needs Response
                  </span>
                )}
                <span className="text-[#71717A] text-xs flex items-center gap-1">
                  <Clock size={10} />{formatDate(review.created_at)}
                </span>
              </div>
            </div>

            {/* Stars */}
            <div className="flex gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={13} className={s <= review.rating ? "text-[#FBBF24] fill-[#FBBF24]" : "text-[#27272A] fill-[#27272A]"} />
              ))}
            </div>

            {/* Review text */}
            <p className="text-[#A1A1AA] text-sm mt-2 leading-relaxed">{review.comment}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#27272A]">
          {!hasAI ? (
            <button
              onClick={onGenerate}
              disabled={generating}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                generating
                  ? "bg-[#7C3AED]/20 text-[#A78BFA] cursor-not-allowed"
                  : "bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-[0_0_20px_rgba(124,58,237,0.3)]"
              )}
            >
              {generating ? (
                <><RefreshCw size={13} className="animate-spin" />Generating...</>
              ) : (
                <><Sparkles size={13} />Generate AI Response</>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={onToggle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-[#A1A1AA] text-sm hover:text-[#FAFAFA] transition-all"
              >
                <Sparkles size={13} className="text-[#7C3AED]" />
                {expanded ? "Hide" : "View"} AI Response
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {!emailSent && (
                <button
                  onClick={onSend}
                  disabled={sending}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    sending
                      ? "bg-[#4ADE80]/10 text-[#4ADE80] cursor-not-allowed"
                      : "bg-[#4ADE80]/10 border border-[#4ADE80]/20 text-[#4ADE80] hover:bg-[#4ADE80]/20"
                  )}
                >
                  {sending ? <><RefreshCw size={13} className="animate-spin" />Sending...</> : <><Send size={13} />Send Email</>}
                </button>
              )}
              <button
                onClick={onGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-[#71717A] text-xs hover:text-[#A1A1AA] transition-all"
              >
                <RefreshCw size={12} className={generating ? "animate-spin" : ""} />
                Regenerate
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI response expanded */}
      <AnimatePresence>
        {expanded && review.ai_response && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="border-t border-[#7C3AED]/20 bg-gradient-to-br from-[#0F0B1A] to-[#111113] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                    <Sparkles size={12} className="text-[#A78BFA]" />
                  </div>
                  <span className="text-[#A78BFA] text-sm font-medium">AI-Generated Response</span>
                </div>
                <div className="flex items-center gap-2">
                  {review.ai_response.email_sent && (
                    <span className="flex items-center gap-1 text-[#4ADE80] text-xs">
                      <Mail size={11} />Emailed to customer
                    </span>
                  )}
                  <span className="text-[#71717A] text-xs">{formatDate(review.ai_response.generated_at)}</span>
                </div>
              </div>
              <p className="text-[#FAFAFA] text-sm leading-relaxed bg-[#18181B] rounded-xl p-4 border border-[#27272A]">
                {review.ai_response.text}
              </p>
              <p className="text-[#71717A] text-xs mt-2 flex items-center gap-1">
                <Sparkles size={10} />
                Generated by Google Gemini AI · Sent on behalf of your restaurant
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
