/**
 * useOrderPolling — polls /api/orders/:id every N ms
 * until the order reaches a terminal status or the component unmounts.
 */
import { useEffect, useRef, useCallback } from "react";
import { orderApi } from "@/lib/api";
import type { OrderDetail } from "@/lib/types";

const TERMINAL = new Set(["delivered", "cancelled"]);
const DEFAULT_INTERVAL_MS = 8_000;

interface Options {
  id: string;
  enabled: boolean;
  intervalMs?: number;
  onUpdate: (order: OrderDetail) => void;
}

export function useOrderPolling({ id, enabled, intervalMs = DEFAULT_INTERVAL_MS, onUpdate }: Options) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) { stop(); return; }

    timerRef.current = setInterval(async () => {
      try {
        const fresh = await orderApi.get(id);
        onUpdate(fresh);
        if (TERMINAL.has(fresh.status)) stop();
      } catch { /* silent — network hiccup */ }
    }, intervalMs);

    return stop;
  }, [id, enabled, intervalMs, onUpdate, stop]);
}
