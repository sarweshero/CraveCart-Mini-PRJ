/**
 * useRestaurant — fetches a single restaurant with loading / error state.
 */
import { useState, useEffect } from "react";
import { restaurantApi } from "@/lib/api";
import type { RestaurantDetail } from "@/lib/types";

interface State {
  data: RestaurantDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRestaurant(id: string): State {
  const [data, setData]       = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    restaurantApi.get(id)
      .then((r) => { if (!cancelled) setData(r); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, tick]);

  return { data, loading, error, refetch: () => setTick(t => t + 1) };
}
