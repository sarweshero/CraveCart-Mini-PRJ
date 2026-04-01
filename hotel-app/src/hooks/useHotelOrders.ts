/**
 * useHotelOrders — fetches hotel orders with auto-refresh for active tabs.
 */
import { useState, useEffect, useCallback } from "react";
import { hotelOrderApi } from "@/lib/api";
import type { HotelOrder } from "@/lib/types";
import type { OrderStatus } from "@/lib/utils";

const ACTIVE_STATUSES = new Set(["all", "placed", "confirmed", "preparing", "out_for_delivery"]);
const REFRESH_MS = 30_000;

interface State {
  orders: HotelOrder[];
  loading: boolean;
  reload: () => void;
}

export function useHotelOrders(status: string): State {
  const [orders, setOrders]   = useState<HotelOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hotelOrderApi.list(status);
      setOrders((res as { results: HotelOrder[] }).results ?? []);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh for active tabs
  useEffect(() => {
    if (!ACTIVE_STATUSES.has(status)) return;
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [status, load]);

  return { orders, loading, reload: load };
}
