"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type RestaurantMediaVariant = "card" | "cover";

type RestaurantMediaImageProps = {
  src?: string | null;
  alt: string;
  seed?: string;
  variant?: RestaurantMediaVariant;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

const CARD_PLACEHOLDERS = [
  "/placeholders/restaurant-card-1.svg",
  "/placeholders/restaurant-card-2.svg",
  "/placeholders/restaurant-card-3.svg",
  "/placeholders/restaurant-card-4.svg",
] as const;

const COVER_PLACEHOLDERS = [
  "/placeholders/restaurant-cover-1.svg",
  "/placeholders/restaurant-cover-2.svg",
] as const;

function pickPlaceholder(seed: string, variant: RestaurantMediaVariant): string {
  const candidates = variant === "cover" ? COVER_PLACEHOLDERS : CARD_PLACEHOLDERS;
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return candidates[hash % candidates.length];
}

export default function RestaurantMediaImage({
  src,
  alt,
  seed,
  variant = "card",
  className,
  sizes,
  priority = false,
}: RestaurantMediaImageProps) {
  const normalizedSrc = (src ?? "").trim();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [normalizedSrc]);

  const fallbackSrc = useMemo(() => pickPlaceholder(seed ?? alt, variant), [seed, alt, variant]);
  const resolvedSrc = !hasError && normalizedSrc ? normalizedSrc : fallbackSrc;

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      priority={priority}
      onError={() => setHasError(true)}
    />
  );
}
