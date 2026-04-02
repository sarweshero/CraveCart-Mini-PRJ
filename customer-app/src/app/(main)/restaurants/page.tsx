"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Star, Clock, X, ChevronDown } from "lucide-react";
import { restaurantApi } from "@/lib/api";
import type { Restaurant, RestaurantFilters } from "@/lib/types";
import { cn, extractList, formatCurrency, debounce } from "@/lib/utils";
import RestaurantMediaImage from "@/components/ui/RestaurantMediaImage";

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "rating", label: "Rating" },
  { value: "delivery_time", label: "Fastest Delivery" },
  { value: "min_order", label: "Min. Order" },
] as const;

function normalizeCuisineTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}

function isPureVegRestaurant(restaurant: Restaurant): boolean {
  const haystack = [
    ...normalizeCuisineTags(restaurant.cuisine_tags),
    restaurant.description ?? "",
    restaurant.name ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes("veg") || haystack.includes("vegetarian") || haystack.includes("pure veg");
}

function applyRestaurantFilters(restaurants: Restaurant[], filters: RestaurantFilters, applySort = true): Restaurant[] {
  const query = filters.search?.trim().toLowerCase() ?? "";

  let data = restaurants.filter((restaurant) => {
    const cuisineTags = normalizeCuisineTags(restaurant.cuisine_tags);
    const matchesSearch =
      !query ||
      restaurant.name.toLowerCase().includes(query) ||
      cuisineTags.some((tag) => tag.toLowerCase().includes(query));

    const matchesCuisine = !filters.cuisine || cuisineTags.includes(filters.cuisine);
    const matchesOpen = !filters.is_open || restaurant.is_open;
    const matchesVeg = !filters.is_veg || isPureVegRestaurant(restaurant);

    return matchesSearch && matchesCuisine && matchesOpen && matchesVeg;
  });

  if (!applySort) return data;

  const sortBy = filters.sort_by ?? "popularity";
  data = [...data].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "delivery_time") return a.avg_delivery_time - b.avg_delivery_time;
    if (sortBy === "min_order") return a.min_order - b.min_order;
    if (a.is_featured !== b.is_featured) return Number(b.is_featured) - Number(a.is_featured);
    return b.rating - a.rating;
  });

  return data;
}

function RestaurantsContent() {
  const searchParams = useSearchParams();
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [filters, setFilters] = useState<RestaurantFilters>({
    search: searchParams.get("search") ?? "",
    cuisine: searchParams.get("cuisine") ?? undefined,
    sort_by: "popularity",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([restaurantApi.categories(), restaurantApi.list()])
      .then(([cats, restaurants]) => {
        setCategories(extractList<{ id: string; name: string }>(cats));
        setAllRestaurants(extractList<Restaurant>(restaurants));
      })
      .finally(() => setLoading(false));
  }, []);

  const debouncedSearch = debounce((val: string) => {
    setFilters((f) => ({ ...f, search: val }));
  }, 300);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    debouncedSearch(val);
  };

  const restaurants = useMemo(
    () => applyRestaurantFilters(allRestaurants, filters),
    [allRestaurants, filters]
  );

  const cuisineCountBase = useMemo(
    () => applyRestaurantFilters(allRestaurants, { ...filters, cuisine: undefined }, false),
    [allRestaurants, filters]
  );

  const openCountBase = useMemo(
    () => applyRestaurantFilters(allRestaurants, { ...filters, is_open: undefined }, false),
    [allRestaurants, filters]
  );

  const vegCountBase = useMemo(
    () => applyRestaurantFilters(allRestaurants, { ...filters, is_veg: undefined }, false),
    [allRestaurants, filters]
  );

  const cuisineCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const category of categories) {
      const count = cuisineCountBase.filter((restaurant) =>
        normalizeCuisineTags(restaurant.cuisine_tags).includes(category.name)
      ).length;
      counts.set(category.name, count);
    }
    return counts;
  }, [categories, cuisineCountBase]);

  const allCount = cuisineCountBase.length;
  const openNowCount = openCountBase.filter((restaurant) => restaurant.is_open).length;
  const pureVegCount = vegCountBase.filter((restaurant) => isPureVegRestaurant(restaurant)).length;

  const activeFilterCount = [filters.cuisine, filters.is_veg, filters.is_open].filter(Boolean).length;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-[#F5EDD8] font-display font-semibold text-3xl mb-1">Restaurants</h1>
          <p className="text-[#9E9080] text-sm">
            {loading ? "Finding restaurants..." : `${restaurants.length} restaurants available`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#161410] border border-[#2A2620] focus-within:border-[#E8A830]/50 transition-colors">
            <Search size={16} className="text-[#9E9080] flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search restaurants or cuisines..."
              className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none"
            />
            {search && (
              <button onClick={() => { setSearch(""); setFilters((f) => ({ ...f, search: "" })); }}>
                <X size={14} className="text-[#9E9080] hover:text-[#F5EDD8]" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all flex-shrink-0",
              showFilters || activeFilterCount > 0
                ? "border-[#E8A830]/50 bg-[#E8A830]/10 text-[#E8A830]"
                : "border-[#2A2620] bg-[#161410] text-[#BFB49A] hover:text-[#F5EDD8]"
            )}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#E8A830] text-[#0C0B09] text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={13} className={cn("transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5 mb-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[#9E9080] text-xs font-medium mb-2">Sort By</label>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFilters((f) => ({ ...f, sort_by: option.value as RestaurantFilters["sort_by"] }))}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                        filters.sort_by === option.value
                          ? "border-[#E8A830]/50 bg-[#E8A830]/10 text-[#E8A830]"
                          : "border-[#2A2620] text-[#9E9080] hover:text-[#F5EDD8]"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#9E9080] text-xs font-medium mb-2">Cuisine</label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.slice(0, 6).map((category) => (
                    <button
                      key={category.id}
                      onClick={() =>
                        setFilters((f) => ({ ...f, cuisine: f.cuisine === category.name ? undefined : category.name }))
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                        filters.cuisine === category.name
                          ? "border-[#E8A830]/50 bg-[#E8A830]/10 text-[#E8A830]"
                          : "border-[#2A2620] text-[#9E9080] hover:text-[#F5EDD8]"
                      )}
                    >
                      {category.name} ({cuisineCounts.get(category.name) ?? 0})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#9E9080] text-xs font-medium mb-2">Quick Filters</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilters((f) => ({ ...f, is_open: !f.is_open }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      filters.is_open
                        ? "border-[#4ADE80]/50 bg-[#4ADE80]/10 text-[#4ADE80]"
                        : "border-[#2A2620] text-[#9E9080] hover:text-[#F5EDD8]"
                    )}
                  >
                    Open Now ({openNowCount})
                  </button>
                  <button
                    onClick={() => setFilters((f) => ({ ...f, is_veg: !f.is_veg }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      filters.is_veg
                        ? "border-[#4ADE80]/50 bg-[#4ADE80]/10 text-[#4ADE80]"
                        : "border-[#2A2620] text-[#9E9080] hover:text-[#F5EDD8]"
                    )}
                  >
                    Pure Veg ({pureVegCount})
                  </button>
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button onClick={() => setFilters({ sort_by: "popularity" })} className="text-[#9E9080] text-xs hover:text-[#F87171] transition-colors">
                Clear all filters
              </button>
            )}
          </motion.div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setFilters((f) => ({ ...f, cuisine: undefined }))}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-all",
              !filters.cuisine
                ? "border-[#E8A830]/50 bg-[#E8A830]/10 text-[#E8A830]"
                : "border-[#2A2620] text-[#9E9080] hover:text-[#F5EDD8]"
            )}
          >
            All ({allCount})
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setFilters((f) => ({ ...f, cuisine: f.cuisine === category.name ? undefined : category.name }))}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-all",
                filters.cuisine === category.name
                  ? "border-[#E8A830]/50 bg-[#E8A830]/10 text-[#E8A830]"
                  : "border-[#2A2620] text-[#9E9080] hover:text-[#F5EDD8]"
              )}
            >
              {category.name} ({cuisineCounts.get(category.name) ?? 0})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array(6).fill(null).map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <p className="text-[#F5EDD8] font-medium">No restaurants found</p>
            <p className="text-[#9E9080] text-sm">Try adjusting your filters</p>
            <button
              onClick={() => { setSearch(""); setFilters({ sort_by: "popularity" }); }}
              className="px-5 py-2.5 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {restaurants.map((restaurant, index) => (
              <motion.div key={restaurant.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                <Link href={`/restaurants/${restaurant.id}`} className="group block">
                  <div className="rounded-2xl overflow-hidden bg-[#161410] border border-[#2A2620] transition-all duration-300 hover:border-[#E8A830]/30 hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1">
                    <div className="relative h-44 overflow-hidden">
                      <RestaurantMediaImage
                        src={restaurant.thumbnail}
                        alt={restaurant.name}
                        seed={`${restaurant.id}-${restaurant.name}`}
                        variant="card"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#161410] via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        {restaurant.discount && <span className="px-2 py-1 rounded-lg bg-[#E8A830] text-[#0C0B09] text-xs font-bold">{restaurant.discount.label}</span>}
                        {!restaurant.is_open && <span className="px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-semibold backdrop-blur-sm">Closed</span>}
                      </div>
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0C0B09]/80 backdrop-blur-sm border border-[#2A2620]/50">
                        <Star size={11} className="text-[#E8A830]" fill="currentColor" />
                        <span className="text-[#F5EDD8] text-xs font-semibold">{restaurant.rating}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-[#F5EDD8] font-semibold text-base truncate">{restaurant.name}</h3>
                      <p className="text-[#9E9080] text-xs mt-0.5 truncate">{normalizeCuisineTags(restaurant.cuisine_tags).join(" • ")}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-[#9E9080]">
                        <span className="flex items-center gap-1"><Clock size={11} />{restaurant.avg_delivery_time} min</span>
                        <span>·</span>
                        <span>Min. {formatCurrency(restaurant.min_order)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="skeleton h-8 w-48 rounded-xl" /></div>}>
      <RestaurantsContent />
    </Suspense>
  );
}
