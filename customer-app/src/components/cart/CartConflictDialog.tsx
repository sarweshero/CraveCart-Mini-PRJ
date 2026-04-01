"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useCartStore } from "@/lib/store";
import type { CartItem } from "@/lib/types";

// ── Reusable dialog (accepts props) ──────────────────────────
interface CartConflictDialogProps {
  existingRestaurantName: string;
  newRestaurantName: string;
  onClearAndAdd: () => Promise<void>;
  onCancel: () => void;
}

export function CartConflictDialog({
  existingRestaurantName,
  newRestaurantName,
  onClearAndAdd,
  onCancel,
}: CartConflictDialogProps) {
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    setClearing(true);
    try { await onClearAndAdd(); } finally { setClearing(false); }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[#161410] border border-[#2A2620] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F5EDD8]">Start a new cart?</h3>
              <p className="text-xs text-[#9E9080]">You have items from another restaurant</p>
            </div>
          </div>

          <p className="text-sm text-[#BFB49A] mb-5">
            Your cart has items from{" "}
            <span className="text-[#F5EDD8] font-medium">{existingRestaurantName}</span>.
            Adding from{" "}
            <span className="text-[#E8A830] font-medium">{newRestaurantName}</span>{" "}
            will clear your existing cart.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-[#2A2620] text-[#9E9080] hover:text-[#BFB49A] text-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" /> Keep Current
            </button>
            <button
              onClick={handleClear}
              disabled={clearing}
              className="flex-1 py-3 rounded-xl bg-[#E8A830] hover:bg-[#F5C842] text-[#0C0B09] font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
            >
              {clearing
                ? <div className="w-4 h-4 border-2 border-[#0C0B09]/30 border-t-[#0C0B09] rounded-full animate-spin" />
                : <><Trash2 className="w-4 h-4" /> Clear &amp; Add</>
              }
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Store-connected listener — place in layout ────────────────
export function CartConflictListener() {
  const { conflictPending, restaurantName, clearConflict, clearCartAndAdd } = useCartStore();

  if (!conflictPending) return null;

  return (
    <CartConflictDialog
      existingRestaurantName={restaurantName ?? "another restaurant"}
      newRestaurantName={conflictPending.restaurantName}
      onClearAndAdd={async () => {
        clearCartAndAdd(
          conflictPending.item,
          conflictPending.restaurantId,
          conflictPending.restaurantName
        );
      }}
      onCancel={clearConflict}
    />
  );
}
