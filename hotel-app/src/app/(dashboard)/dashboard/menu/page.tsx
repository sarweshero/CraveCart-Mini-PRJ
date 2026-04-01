"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, ToggleLeft, ToggleRight, UtensilsCrossed, Flame, Leaf, Loader2, RefreshCw } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { menuApi } from "@/lib/api";
import toast from "react-hot-toast";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  is_veg?: boolean;
  is_bestseller?: boolean;
}
interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  items: MenuItem[];
}

export default function MenuPage() {
  const [categories, setCategories]   = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading]         = useState(true);
  const [togglingId, setTogglingId]   = useState<string | null>(null);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const data = await menuApi.list();
      const cats = (data as { categories: MenuCategory[] }).categories ?? [];
      setCategories(cats);
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].id);
    } catch {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => { loadMenu(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async (itemId: string, currentAvailable: boolean) => {
    setTogglingId(itemId);
    try {
      // Call the API — backend flips is_available and returns new value
      await menuApi.toggleAvailability(itemId, !currentAvailable);

      // Update local state optimistically (API toggles, so we flip locally)
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, is_available: !item.is_available } : item
          ),
        }))
      );

      const itemName = categories
        .flatMap((c) => c.items)
        .find((i) => i.id === itemId)?.name ?? "Item";
      toast.success(`${itemName} is now ${currentAvailable ? "unavailable" : "available"}`);
    } catch {
      toast.error("Failed to update item availability");
    } finally {
      setTogglingId(null);
    }
  };

  const totalItems     = categories.reduce((acc, c) => acc + c.items.length, 0);
  const availableItems = categories.reduce((acc, c) => acc + c.items.filter((i) => i.is_available).length, 0);
  const activecat      = categories.find((c) => c.id === activeCategory);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED] mx-auto mb-2" />
          <p className="text-[#71717A] text-sm">Loading menu…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[#FAFAFA] font-semibold text-3xl mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            Menu Management
          </h1>
          <p className="text-[#71717A] text-sm">
            {availableItems}/{totalItems} items available · Toggle availability in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMenu}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] text-sm transition-colors"
            title="Refresh menu"
          >
            <RefreshCw size={14} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-all shadow-[0_0_20px_rgba(124,58,237,0.25)]">
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Items",    value: totalItems,               color: "#FAFAFA" },
          { label: "Available Now",  value: availableItems,           color: "#4ADE80" },
          { label: "Unavailable",    value: totalItems - availableItems, color: "#F87171" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111113] border border-[#27272A] rounded-2xl px-5 py-4">
            <p className="text-[#71717A] text-xs mb-1">{label}</p>
            <p className="font-bold text-2xl" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-16 bg-[#111113] border border-[#27272A] rounded-2xl">
          <UtensilsCrossed className="w-12 h-12 text-[#3F3F46] mx-auto mb-3" />
          <p className="text-[#FAFAFA] font-semibold">No menu items yet</p>
          <p className="text-[#71717A] text-sm mt-1">Add your first menu category and items to get started.</p>
        </div>
      ) : (
        <div className="flex gap-5">
          {/* Category sidebar */}
          <aside className="w-52 flex-shrink-0">
            <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden sticky top-4">
              {categories.map((cat) => {
                const available = cat.items.filter((i) => i.is_available).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-[#27272A] last:border-0 transition-all",
                      activeCategory === cat.id
                        ? "bg-[#7C3AED]/10 text-[#A78BFA]"
                        : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/5"
                    )}
                  >
                    <span>{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cat.name}</p>
                      <p className="text-[10px] opacity-70">{available}/{cat.items.length} available</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Items grid */}
          <div className="flex-1 min-w-0">
            {activecat && (
              <div className="space-y-3">
                {activecat.items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "bg-[#111113] border rounded-2xl p-4 flex items-center gap-4 transition-all",
                      item.is_available ? "border-[#27272A]" : "border-[#27272A] opacity-60"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#FAFAFA] font-medium text-sm">{item.name}</p>
                        {item.is_veg !== false && <Leaf size={12} className="text-[#4ADE80] flex-shrink-0" />}
                        {item.is_bestseller && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-semibold flex-shrink-0">
                            <Flame size={9} /> Best
                          </span>
                        )}
                        {!item.is_available && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F87171]/10 text-[#F87171] font-semibold">
                            Unavailable
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[#71717A] text-xs mt-0.5 truncate">{item.description}</p>
                      )}
                      <p className="text-[#A78BFA] font-semibold text-sm mt-1">
                        {formatCurrency(item.price)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggle(item.id, item.is_available)}
                      disabled={togglingId === item.id}
                      className="flex-shrink-0 transition-opacity disabled:opacity-50"
                      title={item.is_available ? "Mark unavailable" : "Mark available"}
                    >
                      {togglingId === item.id ? (
                        <Loader2 size={22} className="animate-spin text-[#7C3AED]" />
                      ) : item.is_available ? (
                        <ToggleRight size={28} className="text-[#4ADE80]" />
                      ) : (
                        <ToggleLeft size={28} className="text-[#52525B]" />
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
