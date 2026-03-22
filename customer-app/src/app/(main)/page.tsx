"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, ArrowRight, Star, Clock, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { restaurantApi } from "@/lib/api";
import type { Restaurant, FoodCategory } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export default function HomePage() {
  const router = useRouter();
  const [featured, setFeatured] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [featRes, catRes, allRes] = await Promise.all([
          restaurantApi.featured(),
          restaurantApi.categories(),
          restaurantApi.list(),
        ]);
        setFeatured(extractList<Restaurant>(featRes));
        setCategories(extractList<FoodCategory>(catRes));
        setAllRestaurants(extractList<Restaurant>(allRes));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/restaurants?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[#E8A830]/6 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#E8A830]/4 blur-[80px]" />
          {/* Decorative food images */}
          <div className="absolute right-[-60px] top-20 w-[380px] h-[380px] rounded-[40px] overflow-hidden opacity-30 rotate-6 hidden lg:block">
            <Image src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600" fill alt="" className="object-cover" sizes="380px" />
          </div>
          <div className="absolute right-[200px] top-40 w-[200px] h-[200px] rounded-[30px] overflow-hidden opacity-20 -rotate-3 hidden lg:block">
            <Image src="https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400" fill alt="" className="object-cover" sizes="200px" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-2xl"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8A830]/10 border border-[#E8A830]/20 text-[#E8A830] text-xs font-semibold mb-6">
              <Zap size={12} fill="currentColor" />
              Fast delivery in 20–45 mins
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-6xl lg:text-7xl font-display font-semibold text-[#F5EDD8] leading-[1.05] tracking-tight"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Craving{" "}
              <span className="text-[#E8A830] italic">something</span>
              <br />
              delicious?
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 text-[#BFB49A] text-lg leading-relaxed max-w-xl">
              Order from the best restaurants around you. Every bite backed by AI-powered feedback — because great food deserves great conversation.
            </motion.p>

            {/* Location + Search */}
            <motion.form variants={fadeUp} onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#161410] border border-[#2A2620] min-w-0 flex-shrink-0">
                <MapPin size={16} className="text-[#E8A830] flex-shrink-0" />
                <span className="text-[#BFB49A] text-sm truncate">Coimbatore, Tamil Nadu</span>
              </div>
              <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#161410] border border-[#2A2620] focus-within:border-[#E8A830]/50 transition-colors">
                <Search size={16} className="text-[#9E9080] flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for dishes or restaurants..."
                  className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#E8A830] text-[#0C0B09] text-sm font-semibold hover:bg-[#F5C842] transition-colors flex-shrink-0"
                >
                  Search
                </button>
              </div>
            </motion.form>

            {/* Stats */}
            <motion.div variants={fadeUp} className="mt-10 flex items-center gap-8">
              {[
                { value: "200+", label: "Restaurants" },
                { value: "4.8★", label: "Average Rating" },
                { value: "25 min", label: "Avg Delivery" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-[#F5EDD8] font-display font-semibold text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
                    {value}
                  </p>
                  <p className="text-[#9E9080] text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#F5EDD8] font-display font-semibold text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            What are you craving?
          </h2>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {(loading ? Array(8).fill(null) : categories).map((cat, i) =>
            !cat ? (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ) : (
              <Link
                key={cat.id}
                href={`/restaurants?cuisine=${encodeURIComponent(cat.name)}`}
                className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#161410] border border-[#2A2620] hover:border-[#E8A830]/40 transition-all hover:shadow-[0_0_20px_rgba(232,168,48,0.1)]"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-[#BFB49A] text-xs font-medium text-center leading-tight">{cat.name}</span>
              </Link>
            )
          )}
        </div>
      </section>

      {/* ── Featured ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#F5EDD8] font-display font-semibold text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            🔥 Featured today
          </h2>
          <Link href="/restaurants" className="text-[#E8A830] text-sm font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all">
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(loading ? Array(3).fill(null) : featured).map((rest, i) =>
            !rest ? (
              <div key={i} className="skeleton h-72 rounded-2xl" />
            ) : (
              <RestaurantCard key={rest.id} restaurant={rest} />
            )
          )}
        </div>
      </section>

      {/* ── All Restaurants ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#F5EDD8] font-display font-semibold text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            All Restaurants
          </h2>
          <Link href="/restaurants" className="text-[#E8A830] text-sm font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(loading ? Array(6).fill(null) : allRestaurants).map((rest, i) =>
            !rest ? (
              <div key={i} className="skeleton h-64 rounded-2xl" />
            ) : (
              <RestaurantCard key={rest.id} restaurant={rest} />
            )
          )}
        </div>
      </section>

      {/* ── AI Feature Callout ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="relative rounded-3xl overflow-hidden border border-[#2A2620] bg-[#161410] p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,168,48,0.12),transparent_60%)] pointer-events-none" />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8A830]/10 border border-[#E8A830]/20 text-[#E8A830] text-xs font-semibold mb-4">
              ✨ Powered by Google Gemini AI
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-[#F5EDD8] leading-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
              Your feedback, answered{" "}
              <span className="text-[#E8A830] italic">intelligently</span>
            </h2>
            <p className="mt-4 text-[#BFB49A] text-base leading-relaxed">
              When you rate and review your order, our AI crafts a personalized, thoughtful response on behalf of the restaurant — mailed directly to your inbox. Because every review deserves more than just ★ stars.
            </p>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold hover:bg-[#F5C842] transition-colors shadow-[0_0_25px_rgba(232,168,48,0.25)]"
            >
              View My Orders
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Restaurant Card ──

function RestaurantCard({ restaurant: r }: { restaurant: Restaurant }) {
  const cuisineTagsRaw = r.cuisine_tags as unknown;
  const safeCuisineTags: string[] = Array.isArray(cuisineTagsRaw)
    ? cuisineTagsRaw.filter((tag): tag is string => typeof tag === "string")
    : typeof cuisineTagsRaw === "string"
      ? cuisineTagsRaw.split(",").map((tag: string) => tag.trim()).filter(Boolean)
      : [];

  return (
    <Link href={`/restaurants/${r.id}`} className="group block">
      <div className="rounded-2xl overflow-hidden bg-[#161410] border border-[#2A2620] transition-all duration-300 hover:border-[#E8A830]/30 hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1">
        {/* Image */}
        <div className="relative h-44 overflow-hidden">
          <Image
            src={r.thumbnail}
            alt={r.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#161410] via-transparent to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {r.discount && (
              <span className="px-2 py-1 rounded-lg bg-[#E8A830] text-[#0C0B09] text-xs font-bold shadow-md">
                {r.discount.label}
              </span>
            )}
            {!r.is_open && (
              <span className="px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-semibold backdrop-blur-sm">
                Closed
              </span>
            )}
          </div>

          {/* Rating bubble */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0C0B09]/80 backdrop-blur-sm border border-[#2A2620]/50">
            <Star size={11} className="text-[#E8A830]" fill="currentColor" />
            <span className="text-[#F5EDD8] text-xs font-semibold">{r.rating}</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[#F5EDD8] font-semibold text-base leading-tight truncate">{r.name}</h3>
              <p className="text-[#9E9080] text-xs mt-0.5 truncate">{safeCuisineTags.join(", ")}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-[#9E9080]">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {r.avg_delivery_time} min
            </span>
            <span>•</span>
            <span>Min. {formatCurrency(r.min_order)}</span>
            <span>•</span>
            <span>{formatCurrency(r.delivery_fee)} delivery</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {safeCuisineTags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-[#1E1B16] border border-[#2A2620] text-[#9E9080] text-[10px] font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
