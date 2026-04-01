"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, Copy, Percent, IndianRupee, Calendar, Users, X, Zap, Check } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { hotelCouponApi, type HotelCoupon } from "@/lib/api";

function generateCode() {
  const words = ["FEAST","DEAL","SAVE","YUMMY","CRAVE","SPICE"];
  return words[Math.floor(Math.random() * words.length)] + Math.floor(Math.random() * 900 + 100);
}

interface CreateForm {
  code: string; description: string; coupon_type: "percentage" | "flat";
  value: string; max_discount: string; min_order: string; max_uses: string; expires_at: string;
}

const DEFAULT_FORM: CreateForm = {
  code: "", description: "", coupon_type: "percentage",
  value: "", max_discount: "", min_order: "0", max_uses: "", expires_at: "",
};

export default function CouponsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM);
  const set = (k: keyof CreateForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["hotel-coupons"],
    queryFn: hotelCouponApi.list,
  });

  const createMut = useMutation({
    mutationFn: hotelCouponApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-coupons"] }); setShowCreate(false); setForm(DEFAULT_FORM); toast.success("Coupon created!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => hotelCouponApi.toggle(id, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hotel-coupons"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: hotelCouponApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-coupons"] }); toast.success("Coupon deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCreate() {
    if (!form.code.trim()) { toast.error("Coupon code required"); return; }
    if (!form.description.trim()) { toast.error("Description required"); return; }
    if (!form.value || isNaN(+form.value) || +form.value <= 0) { toast.error("Valid discount value required"); return; }
    if (!form.expires_at) { toast.error("Expiry date required"); return; }
    createMut.mutate({
      code: form.code.toUpperCase().trim(),
      description: form.description,
      coupon_type: form.coupon_type,
      value: parseFloat(form.value),
      max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
      min_order: parseFloat(form.min_order) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
      expires_at: new Date(form.expires_at).toISOString(),
    });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)", color: "var(--text)" }}>Coupons</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{coupons.length} coupon{coupons.length !== 1 ? "s" : ""} total</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors"
          style={{ background: "var(--accent)" }}>
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {/* Coupons list */}
      {isLoading ? (
        <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--bg-elevated)" }} />)}</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <Tag className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
          <h3 className="font-semibold" style={{ color: "var(--text)" }}>No coupons yet</h3>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Create your first coupon to attract more orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(coupon => {
            const expired = new Date(coupon.expires_at) < new Date();
            const usedPct = coupon.max_uses ? Math.round((coupon.used_count / coupon.max_uses) * 100) : 0;
            return (
              <motion.div key={coupon.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 border transition-all" style={{ background: "var(--bg-card)", borderColor: coupon.is_active && !expired ? "var(--border)" : "var(--border)", opacity: !coupon.is_active || expired ? 0.65 : 1 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: coupon.is_active && !expired ? "rgba(217,119,6,0.1)" : "var(--bg-elevated)" }}>
                      <Tag className="w-5 h-5" style={{ color: coupon.is_active && !expired ? "var(--accent)" : "var(--text-faint)" }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold" style={{ color: "var(--text)" }}>{coupon.code}</span>
                        <button onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success("Copied!"); }}>
                          <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-faint)" }} />
                        </button>
                        {expired && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-500/10 text-red-400">Expired</span>}
                        {!expired && !coupon.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--bg-elevated)", color: "var(--text-faint)" }}>Inactive</span>}
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{coupon.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleMut.mutate({ id: coupon.id, is_active: !coupon.is_active })}>
                      {coupon.is_active ? <ToggleRight className="w-6 h-6" style={{ color: "var(--accent)" }} /> : <ToggleLeft className="w-6 h-6" style={{ color: "var(--text-faint)" }} />}
                    </button>
                    <button onClick={() => { if (confirmDeleteId === coupon.id) { deleteMut.mutate(coupon.id); setConfirmDeleteId(null); } else { setConfirmDeleteId(coupon.id); } }} title={confirmDeleteId === coupon.id ? "Click again to confirm" : "Delete coupon"}>
                      <Trash2 className="w-4 h-4 transition-colors hover:text-red-400" style={{ color: "var(--text-faint)" }} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                    {coupon.coupon_type === "percentage" ? <Percent className="w-3 h-3" /> : <IndianRupee className="w-3 h-3" />}
                    {coupon.coupon_type === "percentage" ? `${coupon.value}% off` : `₹${coupon.value} off`}
                  </span>
                  {coupon.min_order > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "var(--bg-elevated)" }}>Min ₹{coupon.min_order}</span>
                  )}
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                    <Users className="w-3 h-3" />{coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ""} used
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                    <Calendar className="w-3 h-3" />{expired ? "Expired" : `Expires ${format(new Date(coupon.expires_at), "d MMM yy")}`}
                  </span>
                </div>

                {coupon.max_uses && (
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-faint)" }}>
                      <span>Usage</span><span>{usedPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, background: usedPct >= 90 ? "#EF4444" : "var(--accent)" }} />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>Create New Coupon</h3>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: "var(--bg-elevated)" }}>
                  <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>

              <div className="space-y-4">
                <MField label="Coupon Code *">
                  <div className="flex gap-2">
                    <input className="mf flex-1 uppercase" placeholder="SAVE50" maxLength={20} value={form.code} onChange={e => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
                    <button onClick={() => set("code", generateCode())} className="px-3 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      <Zap className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} /> Auto
                    </button>
                  </div>
                </MField>
                <MField label="Description *"><input className="mf" placeholder="Get 20% off on orders above ₹200" value={form.description} onChange={e => set("description", e.target.value)} /></MField>
                <div className="grid grid-cols-2 gap-3">
                  <MField label="Type *">
                    <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                      {(["percentage","flat"] as const).map(t => (
                        <button key={t} onClick={() => set("coupon_type", t)}
                          className="flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                          style={form.coupon_type === t ? { background: "var(--accent)", color: "white" } : { color: "var(--text-muted)" }}>
                          {t === "percentage" ? <Percent className="w-3.5 h-3.5" /> : <IndianRupee className="w-3.5 h-3.5" />}
                          {t === "percentage" ? "%" : "₹"}
                        </button>
                      ))}
                    </div>
                  </MField>
                  <MField label="Value *">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-faint)" }}>{form.coupon_type === "percentage" ? "%" : "₹"}</span>
                      <input className="mf pl-7" type="number" min="0" placeholder={form.coupon_type === "percentage" ? "20" : "50"} value={form.value} onChange={e => set("value", e.target.value)} />
                    </div>
                  </MField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {form.coupon_type === "percentage" && (
                    <MField label="Max Discount (₹)"><input className="mf" type="number" min="0" placeholder="100" value={form.max_discount} onChange={e => set("max_discount", e.target.value)} /></MField>
                  )}
                  <MField label="Min Order (₹)"><input className="mf" type="number" min="0" placeholder="0" value={form.min_order} onChange={e => set("min_order", e.target.value)} /></MField>
                  <MField label="Max Uses"><input className="mf" type="number" min="1" placeholder="Unlimited" value={form.max_uses} onChange={e => set("max_uses", e.target.value)} /></MField>
                </div>
                <MField label="Expiry Date *"><input className="mf" type="datetime-local" min={new Date().toISOString().slice(0,16)} value={form.expires_at} onChange={e => set("expires_at", e.target.value)} /></MField>

                {form.code && form.value && (
                  <div className="p-3 rounded-xl" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--accent)" }}>Preview</div>
                    <div className="font-mono font-bold" style={{ color: "var(--text)" }}>{form.code}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {form.coupon_type === "percentage" ? `${form.value}% off${form.max_discount ? ` (max ₹${form.max_discount})` : ""}` : `₹${form.value} flat off`}
                      {+form.min_order > 0 ? ` · Min order ₹${form.min_order}` : ""}
                    </div>
                  </div>
                )}

                <button onClick={handleCreate} disabled={createMut.isPending}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                  style={{ background: "var(--accent)" }}>
                  {createMut.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4" /> Create Coupon</>}
                </button>
              </div>

              <style jsx>{`
                :global(.mf) { width: 100%; border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; font-size: 13px; color: var(--text); background: var(--bg); outline: none; transition: border-color 0.2s; }
                :global(.mf:focus) { border-color: var(--accent); }
                :global(.mf::placeholder) { color: var(--text-faint); }
              `}</style>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}
