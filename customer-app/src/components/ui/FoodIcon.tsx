"use client";

import Image from "next/image";

const ICON_MAP: Record<string, string> = {
  "south indian": "/generated-icons/south-indian.png",
  biryani: "/generated-icons/biryani.png",
  pizza: "/generated-icons/pizza.png",
  burgers: "/generated-icons/burgers.png",
  chinese: "/generated-icons/chinese.png",
  desserts: "/generated-icons/desserts.png",
  "street food": "/generated-icons/street-food.png",
  beverages: "/generated-icons/beverages.png",
  starters: "/generated-icons/starters.png",
  "biryani specials": "/generated-icons/biryani-specials.png",
  "breads & gravies": "/generated-icons/breads-gravies.png",
  "quick bites & add-ons": "/generated-icons/quick-bites-addons.png",
  sides: "/generated-icons/sides.png",
  pasta: "/generated-icons/pasta.png",
  drinks: "/generated-icons/drinks.png",
  ramen: "/generated-icons/ramen.png",
};

function normalizeLabel(label?: string | null): string {
  return (label ?? "").trim().toLowerCase();
}

export function FoodIcon({
  label,
  fallback,
  size = 28,
  className = "",
}: {
  label?: string | null;
  fallback?: string | null;
  size?: number;
  className?: string;
}) {
  const src = ICON_MAP[normalizeLabel(label)];

  if (src) {
    return (
      <span
        className={`relative inline-flex items-center justify-center rounded-xl bg-[#1A1610]/82 ring-1 ring-[#2A2620]/80 shadow-[0_6px_18px_rgba(0,0,0,0.18)] ${className}`}
        style={{ width: size, height: size }}
      >
        <Image src={src} alt={label ?? "Food icon"} fill className="object-contain p-1.5" sizes={`${size}px`} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-[#1A1610]/82 ring-1 ring-[#2A2620]/80 text-[0.95em] shadow-[0_6px_18px_rgba(0,0,0,0.18)] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {fallback ?? "•"}
    </span>
  );
}
