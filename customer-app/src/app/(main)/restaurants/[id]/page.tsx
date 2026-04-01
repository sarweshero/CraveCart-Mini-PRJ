"use client";

import { useState, useEffect, useRef, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Clock, MapPin, Phone, ChevronLeft, Search,
  Plus, Minus, Flame, Leaf, ChevronRight, Info,
} from "lucide-react";
import { restaurantApi, cartApi } from "@/lib/api";
import type { RestaurantDetail, MenuItem } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { useCartStore, useUIStore } from "@/lib/store";
import toast from "react-hot-toast";

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [menuSearch, setMenuSearch] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { addItem, getItemQuantity, updateQuantity, hasItem } = useCartStore();
  const { openCart } = useUIStore();

  useEffect(() => {
    restaurantApi.get(id).then((data) => {
      setRestaurant(data);
      if (data.menu_categories[0]) setActiveCategory(data.menu_categories[0].id);
    }).catch(() => setRestaurant(null)).finally(() => setLoading(false));
  }, [id]);

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const el = categoryRefs.current[catId];
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  };

  const handleAddToCart = async (item: MenuItem) => {
    if (!restaurant) return;
    if (!item.is_available) return;

    // 1. Optimistically update the local store for instant UI feedback
    const cartItem = {
      id: `ci_${item.id}_${Date.now()}`,
      menu_item: { id: item.id, name: item.name, price: item.price, image: item.image },
      quantity: 1,
      customizations: [],
      item_total: item.price,
    };
    addItem(cartItem, restaurant.id, restaurant.name);

    // 2. Sync to backend cart so the order placement works
    try {
      await cartApi.addItem(String(item.id), 1);
    } catch {
      // Backend sync failed — silently continue (cart will be re-synced at checkout)
      // This can happen if user is not logged in or backend is briefly unavailable
    }

    toast.success(`${item.name} added to cart`, { icon: "🛒", duration: 1500 });
  };

  const filteredCategories = restaurant?.menu_categories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => {
      const matchesSearch = menuSearch === "" || item.name.toLowerCase().includes(menuSearch.toLowerCase());
      const matchesVeg = !isVegOnly || item.is_veg;
      return matchesSearch && matchesVeg;
    }),
  })).filter((cat) => cat.items.length > 0);

  if (loading) return <LoadingSkeleton />;
  if (!restaurant) return <div className="flex items-center justify-center min-h-screen text-[#9E9080]">Restaurant not found</div>;

  return (
    <div className="min-h-screen">
      {/* ── Cover image ── */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <Image src={restaurant.cover_image} alt={restaurant.name} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0B09] via-[#0C0B09]/40 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-[#0C0B09]/70 backdrop-blur-md border border-[#2A2620]/50 flex items-center justify-center text-[#F5EDD8] hover:bg-[#161410] transition-all"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* ── Restaurant info ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#2A2620] flex-shrink-0">
              <Image src={restaurant.thumbnail} alt={restaurant.name} fill className="object-cover" sizes="64px" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-[#F5EDD8] font-display font-semibold text-2xl leading-tight"
                  className="font-display">
                  {restaurant.name}
                </h1>
                <span className={cn("badge flex-shrink-0", restaurant.is_open ? "badge-success" : "badge-error")}>
                  {restaurant.is_open ? "Open" : "Closed"}
                </span>
              </div>
              <p className="text-[#9E9080] text-sm mt-1">{restaurant.cuisine_tags.join(" • ")}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-[#E8A830]" fill="currentColor" />
                  <span className="text-[#F5EDD8] font-semibold text-sm">{restaurant.rating}</span>
                  <span className="text-[#9E9080] text-xs">({restaurant.total_reviews.toLocaleString()} reviews)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#9E9080] text-sm">
                  <Clock size={13} />
                  {restaurant.avg_delivery_time} min
                </div>
                <div className="text-[#9E9080] text-sm">
                  Min: {formatCurrency(restaurant.min_order)}
                </div>
                {restaurant.timings && (
                  <div className="text-[#9E9080] text-sm">{restaurant.timings}</div>
                )}
              </div>
              {restaurant.address && (
                <div className="flex items-start gap-1.5 mt-2 text-xs text-[#9E9080]">
                  <MapPin size={11} className="flex-shrink-0 mt-0.5" />
                  <span>{restaurant.address}</span>
                </div>
              )}
              {restaurant.fssai && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Info size={11} className="text-[#9E9080]" />
                  <span className="text-[#9E9080] text-xs">FSSAI: {restaurant.fssai}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex gap-6 pb-16">
          {/* Sticky category sidebar */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-24 bg-[#161410] border border-[#2A2620] rounded-2xl overflow-hidden">
              {restaurant.menu_categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm transition-all border-b border-[#2A2620] last:border-0",
                    activeCategory === cat.id
                      ? "bg-[#E8A830]/10 text-[#E8A830] font-medium"
                      : "text-[#BFB49A] hover:text-[#F5EDD8] hover:bg-white/5"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Menu area */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap sticky top-20 z-20 py-2">
              <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#161410] border border-[#2A2620] focus-within:border-[#E8A830]/50 transition-colors min-w-[180px]">
                <Search size={15} className="text-[#9E9080] flex-shrink-0" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search menu..."
                  className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none"
                />
              </div>
              <button
                onClick={() => setIsVegOnly((v) => !v)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  isVegOnly
                    ? "bg-[#4ADE80]/10 border-[#4ADE80]/30 text-[#4ADE80]"
                    : "bg-[#161410] border-[#2A2620] text-[#BFB49A] hover:text-[#F5EDD8]"
                )}
              >
                <Leaf size={14} />
                Veg Only
              </button>
            </div>

            {/* Menu categories */}
            {filteredCategories?.map((cat) => (
              <div
                key={cat.id}
                ref={(el) => { categoryRefs.current[cat.id] = el; }}
              >
                <h2 className="flex items-center gap-2 text-[#F5EDD8] font-display font-semibold text-xl mb-4"
                  className="font-display">
                  <span>{cat.icon}</span>
                  {cat.name}
                </h2>

                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      quantity={getItemQuantity(item.id)}
                      onAdd={() => handleAddToCart(item)}
                      onUpdate={(qty) => {
                        const storeItem = useCartStore.getState().items.find((i) => i.menu_item.id === item.id);
                        if (storeItem) updateQuantity(storeItem.id, qty);
                      }}
                      onExpand={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filteredCategories?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-[#9E9080]">No items match your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={() => { handleAddToCart(selectedItem); setSelectedItem(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Menu Item Row ──

const MenuItemRow = memo(function MenuItemRow({
  item, quantity, onAdd, onUpdate, onExpand,
}: {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onUpdate: (qty: number) => void;
  onExpand: () => void;
}) {
  return (
    <div className={cn(
      "flex gap-4 p-4 rounded-2xl bg-[#161410] border transition-all duration-200",
      item.is_available
        ? "border-[#2A2620] hover:border-[#E8A830]/25"
        : "border-[#2A2620] opacity-60"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {/* Veg/NonVeg */}
          <span className={item.is_veg ? "veg-dot" : "nonveg-dot"} />
          {item.is_bestseller && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#E8A830]">
              <Flame size={10} fill="currentColor" />
              BESTSELLER
            </span>
          )}
          {item.spice_level && (
            <span className="text-[10px] font-medium text-[#F97316] bg-[#F97316]/10 px-1.5 py-0.5 rounded">
              {item.spice_level}
            </span>
          )}
        </div>

        <h3
          className="text-[#F5EDD8] font-medium text-sm leading-snug cursor-pointer hover:text-[#E8A830] transition-colors"
          onClick={onExpand}
        >
          {item.name}
        </h3>
        <p className="text-[#9E9080] text-xs mt-1 leading-relaxed line-clamp-2">{item.description}</p>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-[#F5EDD8] font-semibold text-sm">{formatCurrency(item.price)}</span>
          {item.original_price && (
            <span className="text-[#9E9080] text-xs line-through">{formatCurrency(item.original_price)}</span>
          )}
          {!item.is_available && (
            <span className="text-[#F87171] text-xs font-medium">Currently unavailable</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 flex-shrink-0">
        {item.image && (
          <div
            className="relative w-24 h-20 rounded-xl overflow-hidden cursor-pointer group"
            onClick={onExpand}
          >
            <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="96px" />
            {!item.is_available && (
              <div className="absolute inset-0 bg-[#0C0B09]/60 flex items-center justify-center">
                <span className="text-[10px] text-[#9E9080] font-medium">Unavailable</span>
              </div>
            )}
          </div>
        )}

        {item.is_available && (
          quantity === 0 ? (
            <button
              onClick={onAdd}
              className="px-5 py-2 rounded-xl border border-[#E8A830] text-[#E8A830] text-sm font-semibold hover:bg-[#E8A830] hover:text-[#0C0B09] transition-all"
            >
              Add
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdate(quantity - 1)}
                className="w-8 h-8 rounded-lg bg-[#E8A830]/10 border border-[#E8A830]/30 flex items-center justify-center text-[#E8A830] hover:bg-[#E8A830] hover:text-[#0C0B09] transition-all"
              >
                <Minus size={13} />
              </button>
              <span className="text-[#F5EDD8] font-semibold text-sm w-5 text-center">{quantity}</span>
              <button
                onClick={onAdd}
                className="w-8 h-8 rounded-lg bg-[#E8A830]/10 border border-[#E8A830]/30 flex items-center justify-center text-[#E8A830] hover:bg-[#E8A830] hover:text-[#0C0B09] transition-all"
              >
                <Plus size={13} />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Item Detail Modal ──

function ItemDetailModal({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#161410] border border-[#2A2620] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
      >
        <div className="relative h-56">
          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="448px" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161410] to-transparent" />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className={item.is_veg ? "veg-dot" : "nonveg-dot"} />
            {item.is_bestseller && <span className="text-[10px] font-bold text-[#E8A830]">★ BESTSELLER</span>}
          </div>
          <h2 className="text-[#F5EDD8] font-display font-semibold text-xl">{item.name}</h2>
          <p className="text-[#9E9080] text-sm mt-2 leading-relaxed">{item.description}</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-[#E8A830] font-display font-semibold text-2xl">{formatCurrency(item.price)}</span>
            <button
              onClick={onAdd}
              className="px-6 py-2.5 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold hover:bg-[#F5C842] transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="skeleton h-72 w-full" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        <div className="skeleton h-40 rounded-2xl mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}
