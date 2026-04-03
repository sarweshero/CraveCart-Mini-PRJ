"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, ArrowRight, Star, Clock, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { restaurantApi } from "@/lib/api";
import type { Restaurant, FoodCategory } from "@/lib/types";
import { useRouter } from "next/navigation";
import { extractList, formatCurrency } from "@/lib/utils";
import RestaurantMediaImage from "@/components/ui/RestaurantMediaImage";

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

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
      <section className="relative overflow-hidden pt-10 pb-14 md:pt-14 md:pb-20">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#E8A830]/8 to-transparent" />
          <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#E8A830]/10 blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]"
          >
            <div className="max-w-3xl">
              {/* Badge */}
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8A830]/12 border border-[#E8A830]/25 text-[#E8A830] text-xs font-semibold mb-6">
                <Zap size={12} fill="currentColor" />
                Fast delivery in 20–45 mins
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl md:text-6xl font-display font-semibold text-[#F5EDD8] leading-[1.05] tracking-[-0.03em]"
              >
                Big cravings,
                <br />
                one <span className="text-[#E8A830] italic">tap away</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="mt-6 text-[#BFB49A] text-base sm:text-lg leading-relaxed max-w-xl">
                From local legends to everyday favorites, get great food delivered with smooth ordering, transparent pricing, and a smarter experience at every step.
              </motion.p>

              {/* Location + Search */}
              <motion.form variants={fadeUp} onSubmit={handleSearch} className="mt-8 grid grid-cols-1 sm:grid-cols-[220px_1fr_auto] gap-3 max-w-3xl p-3 rounded-2xl bg-[#161410]/86 border border-[#2A2620] shadow-[0_10px_32px_rgba(0,0,0,0.22)]">
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0F0D0B] border border-[#2A2620] min-w-0">
                  <MapPin size={16} className="text-[#E8A830] flex-shrink-0" />
                  <span className="text-[#BFB49A] text-sm truncate">Coimbatore, Tamil Nadu</span>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0F0D0B] border border-[#2A2620] focus-within:border-[#E8A830]/45 transition-colors">
                  <Search size={16} className="text-[#9E9080] flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for dishes or restaurants..."
                    className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#E8A830] text-[#0C0B09] text-sm font-semibold hover:bg-[#F5C842] transition-colors shadow-[0_8px_20px_rgba(232,168,48,0.24)]"
                >
                  Search
                </button>
              </motion.form>

              {/* Stats */}
              <motion.div variants={fadeUp} className="mt-9 grid grid-cols-3 gap-3 max-w-xl">
                {[
                  { value: "200+", label: "Restaurants" },
                  { value: "4.8★", label: "Average Rating" },
                  { value: "25 min", label: "Avg Delivery" },
                ].map(({ value, label }) => (
                  <div key={label} className="rounded-xl border border-[#2A2620] bg-[#161410]/86 px-4 py-3">
                    <p className="text-[#F5EDD8] font-display font-semibold text-xl sm:text-2xl tracking-tight">
                      {value}
                    </p>
                    <p className="text-[#9E9080] text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div variants={fadeUp} className="hidden lg:flex justify-end">
              <Image
                src="/cravecart-logo.svg"
                alt="CraveCart"
                width={680}
                height={340}
                priority
                className="h-auto w-[360px] xl:w-[430px]"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-[#F5EDD8] font-display font-semibold text-xl sm:text-2xl tracking-tight">
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
                className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#161410]/88 border border-[#2A2620] hover:border-[#E8A830]/40 transition-all duration-300 hover:shadow-[0_8px_18px_rgba(0,0,0,0.24)] active:scale-[0.98]"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{cat.icon}</span>
                <span className="text-[#BFB49A] text-[11px] sm:text-xs font-medium text-center leading-tight group-hover:text-[#F5EDD8] transition-colors">{cat.name}</span>
              </Link>
            )
          )}
        </div>
      </section>

      {/* ── Featured ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-[#F5EDD8] font-display font-semibold text-xl sm:text-2xl tracking-tight">
            Featured today
          </h2>
          <Link href="/restaurants" className="group text-[#E8A830] text-sm font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all">
            See all <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-[#F5EDD8] font-display font-semibold text-xl sm:text-2xl tracking-tight">
            All Restaurants
          </h2>
          <Link href="/restaurants" className="group text-[#E8A830] text-sm font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all">
            View all <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="relative rounded-3xl overflow-hidden border border-[#2A2620] bg-[#161410]/88 p-8 md:p-12 lg:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,168,48,0.08),transparent_60%)] pointer-events-none" />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#E8A830]/10 border border-[#E8A830]/20 text-[#E8A830] text-xs font-semibold mb-5 backdrop-blur-sm">
              Powered by Google Gemini AI
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-semibold text-[#F5EDD8] leading-tight tracking-tight">
              Your feedback, answered{" "}
              <span className="text-[#E8A830] italic">intelligently</span>
            </h2>
            <p className="mt-4 text-[#BFB49A] text-sm sm:text-base leading-relaxed max-w-lg">
              When you rate and review your order, our AI crafts a personalized, thoughtful response on behalf of the restaurant — mailed directly to your inbox.
            </p>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 mt-7 px-6 py-3.5 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold hover:bg-[#F5C842] transition-all shadow-[0_0_25px_rgba(232,168,48,0.25)] hover:shadow-[0_0_35px_rgba(232,168,48,0.35)] active:scale-[0.98]"
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
      <div className="rounded-2xl overflow-hidden bg-[#161410]/90 border border-[#2A2620] transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#E8A830]/30 hover:shadow-[0_10px_28px_rgba(0,0,0,0.34)] hover:-translate-y-1">
        {/* Image */}
        <div className="relative h-44 overflow-hidden">
          <RestaurantMediaImage
            src={r.thumbnail}
            alt={r.name}
            seed={`${r.id}-${r.name}`}
            variant="card"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#161410] via-[#161410]/20 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {r.discount && (
              <span className="px-2.5 py-1 rounded-lg bg-[#E8A830] text-[#0C0B09] text-xs font-bold shadow-[0_2px_8px_rgba(232,168,48,0.3)]">
                {r.discount.label}
              </span>
            )}
            {!r.is_open && (
              <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white/90 text-xs font-semibold backdrop-blur-sm">
                Closed
              </span>
            )}
          </div>

          {/* Rating bubble */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0C0B09]/85 backdrop-blur-sm border border-[#2A2620]/50">
            <Star size={11} className="text-[#E8A830]" fill="currentColor" />
            <span className="text-[#F5EDD8] text-xs font-bold">{r.rating}</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[#F5EDD8] font-semibold text-[15px] leading-tight truncate group-hover:text-[#E8A830] transition-colors duration-300">{r.name}</h3>
              <p className="text-[#9E9080] text-xs mt-1 truncate">{safeCuisineTags.join(" · ")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 text-xs text-[#9E9080]">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {r.avg_delivery_time} min
            </span>
            <span className="w-1 h-1 rounded-full bg-[#2A2620]" />
            <span>Min. {formatCurrency(r.min_order)}</span>
            <span className="w-1 h-1 rounded-full bg-[#2A2620]" />
            <span>{formatCurrency(r.delivery_fee)} delivery</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {safeCuisineTags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-[#1E1B16] border border-[#2A2620] text-[#9E9080] text-[10px] font-medium hover:border-[#E8A830]/20 transition-colors">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
