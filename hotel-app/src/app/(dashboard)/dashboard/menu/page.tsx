"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit3, ToggleLeft, ToggleRight, UtensilsCrossed, Flame, Leaf } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// Uses the same mock restaurant data for menu items
const MOCK_MENU = {
  categories: [
    {
      id: "cat_01",
      name: "Idli & Dosa",
      icon: "🥞",
      items: [
        { id: "item_01", name: "Soft Idli (2 pieces)", price: 45, is_veg: true, is_bestseller: true, is_available: true, description: "Classic steamed rice cakes" },
        { id: "item_02", name: "Ghee Roast Dosa", price: 75, is_veg: true, is_bestseller: true, is_available: true, description: "Crispy dosa with generous ghee" },
        { id: "item_03", name: "Masala Dosa", price: 70, is_veg: true, is_bestseller: false, is_available: true, description: "Dosa stuffed with spiced potato" },
        { id: "item_04", name: "Rava Dosa", price: 65, is_veg: true, is_bestseller: false, is_available: false, description: "Crispy semolina dosa" },
      ],
    },
    {
      id: "cat_02",
      name: "Rice & Curries",
      icon: "🍛",
      items: [
        { id: "item_05", name: "Mini Meals (Vegetarian)", price: 130, is_veg: true, is_bestseller: true, is_available: true, description: "Full South Indian meal" },
        { id: "item_06", name: "Sambar Rice", price: 90, is_veg: true, is_bestseller: false, is_available: true, description: "Comfort rice with dal" },
      ],
    },
    {
      id: "cat_03",
      name: "Beverages",
      icon: "☕",
      items: [
        { id: "item_07", name: "Filter Coffee", price: 35, is_veg: true, is_bestseller: true, is_available: true, description: "Traditional South Indian coffee" },
        { id: "item_08", name: "Masala Chai", price: 25, is_veg: true, is_bestseller: false, is_available: true, description: "Spiced ginger tea" },
      ],
    },
  ],
};

type MenuItem = typeof MOCK_MENU.categories[0]["items"][0];

export default function MenuPage() {
  const [menu, setMenu] = useState(MOCK_MENU);
  const [activeCategory, setActiveCategory] = useState("cat_01");

  const toggleAvailability = (catId: string, itemId: string) => {
    setMenu((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.id === catId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, is_available: !item.is_available } : item
              ),
            }
          : cat
      ),
    }));
    const item = menu.categories.find((c) => c.id === catId)?.items.find((i) => i.id === itemId);
    toast.success(`${item?.name} marked as ${item?.is_available ? "unavailable" : "available"}`);
  };

  const activecat = menu.categories.find((c) => c.id === activeCategory);
  const totalItems = menu.categories.reduce((acc, c) => acc + c.items.length, 0);
  const availableItems = menu.categories.reduce((acc, c) => acc + c.items.filter((i) => i.is_available).length, 0);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[#FAFAFA] font-display font-semibold text-3xl mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            Menu Management
          </h1>
          <p className="text-[#71717A] text-sm">
            {availableItems}/{totalItems} items available · Toggle availability instantly
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-all shadow-[0_0_20px_rgba(124,58,237,0.25)]">
          <Plus size={14} />
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Items", value: totalItems, color: "#FAFAFA" },
          { label: "Available Now", value: availableItems, color: "#4ADE80" },
          { label: "Unavailable", value: totalItems - availableItems, color: "#F87171" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111113] border border-[#27272A] rounded-2xl px-5 py-4">
            <p className="text-[#71717A] text-xs mb-1">{label}</p>
            <p className="font-bold text-2xl" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Category sidebar */}
        <aside className="w-52 flex-shrink-0">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden sticky top-4">
            {menu.categories.map((cat) => {
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
                    <p className="text-sm font-medium truncate">{cat.name}</p>
                    <p className="text-xs text-[#71717A]">{available}/{cat.items.length} available</p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Items */}
        <div className="flex-1 space-y-3">
          {activecat?.items.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={cn(
                "bg-[#111113] border rounded-2xl p-4 transition-all",
                item.is_available ? "border-[#27272A]" : "border-[#27272A] opacity-60"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={item.is_veg ? "veg-dot" : "nonveg-dot"} />
                    {item.is_bestseller && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#FBBF24]">
                        <Flame size={9} fill="currentColor" />
                        BESTSELLER
                      </span>
                    )}
                  </div>
                  <h3 className="text-[#FAFAFA] font-medium">{item.name}</h3>
                  <p className="text-[#71717A] text-xs mt-0.5">{item.description}</p>
                  <p className="text-[#A78BFA] font-semibold mt-2">{formatCurrency(item.price)}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="w-8 h-8 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] hover:text-[#FAFAFA] transition-all">
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => toggleAvailability(activeCategory, item.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all"
                    style={{
                      background: item.is_available ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                      borderColor: item.is_available ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)",
                      color: item.is_available ? "#4ADE80" : "#F87171",
                    }}
                  >
                    {item.is_available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {item.is_available ? "Available" : "Unavailable"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
