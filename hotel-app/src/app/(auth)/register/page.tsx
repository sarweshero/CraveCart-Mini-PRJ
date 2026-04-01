"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, Building2, Clock, CreditCard, ArrowRight, ArrowLeft, Check, Eye, EyeOff, UtensilsCrossed, AlertCircle, Loader2 } from "lucide-react";
import { BASE_URL } from "@/lib/api";
import { useHotelAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";



const CUISINE_OPTIONS = [
  "South Indian","North Indian","Chinese","Continental","Biryani",
  "Fast Food","Bakery","Pizza","Burger","Seafood","Vegetarian","Desserts","Beverages","Multi-cuisine",
];

const STEPS = [
  { id: 1, label: "Account",    icon: User },
  { id: 2, label: "Restaurant", icon: Building2 },
  { id: 3, label: "Operations", icon: Clock },
  { id: 4, label: "Banking",    icon: CreditCard },
];

interface Form {
  name: string; email: string; password: string; confirm: string; phone: string;
  restaurant_name: string; description: string; cuisine_tags: string[]; fssai: string; restaurant_phone: string;
  address: string; area: string; city: string; state: string; pincode: string;
  open_time: string; close_time: string; min_order: string; delivery_fee: string; avg_delivery_time: string;
  bank_name: string; account_number: string; ifsc: string; pan: string;
}

const DEFAULT_FORM: Form = {
  name: "", email: "", password: "", confirm: "", phone: "",
  restaurant_name: "", description: "", cuisine_tags: [], fssai: "", restaurant_phone: "",
  address: "", area: "", city: "", state: "", pincode: "",
  open_time: "09:00 AM", close_time: "10:00 PM", min_order: "100", delivery_fee: "30", avg_delivery_time: "30",
  bank_name: "", account_number: "", ifsc: "", pan: "",
};

export default function HotelRegisterPage() {
  const router = useRouter();
  const { setAuth } = useHotelAuthStore();
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm]     = useState<Form>(DEFAULT_FORM);

  const set = (k: keyof Form, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

  const toggleCuisine = (tag: string) =>
    set("cuisine_tags", form.cuisine_tags.includes(tag)
      ? form.cuisine_tags.filter(t => t !== tag)
      : [...form.cuisine_tags, tag]);

  function validate(s: number) {
    if (s === 1) {
      if (!form.name.trim()) { toast.error("Full name required"); return false; }
      if (!form.email.includes("@")) { toast.error("Valid email required"); return false; }
      if (form.password.length < 8) { toast.error("Password must be 8+ characters"); return false; }
      if (form.password !== form.confirm) { toast.error("Passwords don't match"); return false; }
      if (!form.phone.trim()) { toast.error("Phone required"); return false; }
    }
    if (s === 2) {
      if (!form.restaurant_name.trim()) { toast.error("Restaurant name required"); return false; }
      if (form.cuisine_tags.length === 0) { toast.error("Select at least one cuisine"); return false; }
      if (!form.city.trim()) { toast.error("City is required"); return false; }
      if (!form.address.trim()) { toast.error("Address is required"); return false; }
    }
    if (s === 3) {
      if (!form.min_order || isNaN(+form.min_order)) { toast.error("Valid minimum order required"); return false; }
    }
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/hotel/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          min_order: parseFloat(form.min_order),
          delivery_fee: parseFloat(form.delivery_fee),
          avg_delivery_time: parseInt(form.avg_delivery_time),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Registration failed");

      // Save token
      if (typeof window !== "undefined") {
        localStorage.setItem("cravecart_hotel_token", data.token);
        document.cookie = `cravecart_hotel_token=${data.token}; path=/; SameSite=Lax; max-age=86400`;
      }
      // Normalize user to Hotel shape
      const hotel = {
        id: data.user?.id ?? "",
        owner_name: data.user?.name ?? form.name,
        email: data.user?.email ?? form.email,
        restaurant_name: form.restaurant_name,
        is_profile_complete: true,
        role: "hotel_admin" as const,
        is_open: false,
      };
      setAuth(hotel, data.token);
      toast.success("Registration successful! Welcome to CraveCart. 🎉");
      router.push("/dashboard");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
      <div className="border-b sticky top-0 z-10 backdrop-blur-md px-6 py-4 flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <span className="font-[var(--font-fraunces)] text-lg font-semibold" style={{ color: "var(--text)" }}>
            CraveCart <span style={{ color: "var(--accent)" }}>Hotels</span>
          </span>
        </div>
        <Link href="/login" className="text-sm transition-colors" style={{ color: "var(--text-muted)" }}>
          Already registered? Sign in
        </Link>
      </div>

      <div className="max-w-lg mx-auto p-6">
        <div className="mb-8">
          <h1 className="font-[var(--font-fraunces)] text-3xl font-bold" style={{ color: "var(--text)" }}>Register your restaurant</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Join 500+ restaurants earning on CraveCart</p>
        </div>

        {/* Step indicator */}
        <div className="flex mb-8 relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 z-0" style={{ background: "var(--border)" }} />
          {STEPS.map((s, i) => {
            const done = step > s.id; const active = step === s.id; const Icon = s.icon;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center relative z-10">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300")} style={{
                  background: done ? "var(--accent)" : active ? "var(--bg-card)" : "var(--bg-card)",
                  borderColor: done || active ? "var(--accent)" : "var(--border)",
                  color: done ? "white" : active ? "var(--accent)" : "var(--text-faint)",
                }}>
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <div className="text-[10px] font-medium mt-1.5" style={{ color: active ? "var(--accent)" : done ? "var(--text)" : "var(--text-faint)" }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
            className="rounded-2xl p-7 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>

            {step === 1 && (
              <div className="space-y-4">
                <StepHeader title="Your account details" subtitle="You'll use these to log in to the dashboard" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name"><input className="hf" placeholder="Ramesh Kumar" value={form.name} onChange={e => set("name", e.target.value)} /></Field>
                  <Field label="Phone"><input className="hf" placeholder="9876543210" value={form.phone} onChange={e => set("phone", e.target.value)} /></Field>
                </div>
                <Field label="Email Address"><input className="hf" type="email" placeholder="owner@restaurant.com" value={form.email} onChange={e => set("email", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Password">
                    <div className="relative">
                      <input className="hf pr-10" type={showPwd ? "text" : "password"} placeholder="8+ characters" value={form.password} onChange={e => set("password", e.target.value)} />
                      <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }}>
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm Password"><input className="hf" type="password" placeholder="Same as above" value={form.confirm} onChange={e => set("confirm", e.target.value)} /></Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <StepHeader title="Restaurant details" subtitle="Tell customers about your restaurant" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Restaurant Name *"><input className="hf" placeholder="Murugan Idli Shop" value={form.restaurant_name} onChange={e => set("restaurant_name", e.target.value)} /></Field>
                  <Field label="FSSAI License"><input className="hf" placeholder="12345678901234" value={form.fssai} onChange={e => set("fssai", e.target.value)} /></Field>
                </div>
                <Field label="Description"><textarea className="hf resize-none h-16" placeholder="What makes your restaurant special…" value={form.description} onChange={e => set("description", e.target.value)} /></Field>
                <div>
                  <label className="hfl">Cuisine Types *</label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {CUISINE_OPTIONS.map(c => (
                      <button key={c} type="button" onClick={() => toggleCuisine(c)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                        style={form.cuisine_tags.includes(c) ? { background: "var(--accent)", borderColor: "var(--accent)", color: "white" } : { borderColor: "var(--border)", color: "var(--text-muted)" }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Full Address *"><input className="hf" placeholder="123, RS Puram" value={form.address} onChange={e => set("address", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Area"><input className="hf" placeholder="RS Puram" value={form.area} onChange={e => set("area", e.target.value)} /></Field>
                  <Field label="City *"><input className="hf" placeholder="Coimbatore" value={form.city} onChange={e => set("city", e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="State"><input className="hf" placeholder="Tamil Nadu" value={form.state} onChange={e => set("state", e.target.value)} /></Field>
                  <Field label="Pincode"><input className="hf" placeholder="641002" maxLength={6} value={form.pincode} onChange={e => set("pincode", e.target.value)} /></Field>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <StepHeader title="Operating details" subtitle="Set your hours and delivery settings" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Opening Time"><input className="hf" placeholder="09:00 AM" value={form.open_time} onChange={e => set("open_time", e.target.value)} /></Field>
                  <Field label="Closing Time"><input className="hf" placeholder="10:00 PM" value={form.close_time} onChange={e => set("close_time", e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Min Order (₹)"><input className="hf" type="number" min="0" placeholder="100" value={form.min_order} onChange={e => set("min_order", e.target.value)} /></Field>
                  <Field label="Delivery Fee (₹)"><input className="hf" type="number" min="0" placeholder="30" value={form.delivery_fee} onChange={e => set("delivery_fee", e.target.value)} /></Field>
                </div>
                <Field label="Avg Delivery Time (min)"><input className="hf" type="number" min="10" max="120" placeholder="30" value={form.avg_delivery_time} onChange={e => set("avg_delivery_time", e.target.value)} /></Field>
                <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                  <p className="text-xs" style={{ color: "var(--accent)" }}>Your restaurant will start as <strong>closed</strong> and go live after our team reviews your details (within 24h).</p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <StepHeader title="Bank & payout details" subtitle="For transferring your earnings (optional)" />
                <Field label="Bank Name"><input className="hf" placeholder="HDFC Bank" value={form.bank_name} onChange={e => set("bank_name", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Account Number"><input className="hf" placeholder="XXXXXXXXXXXXXXXX" value={form.account_number} onChange={e => set("account_number", e.target.value)} /></Field>
                  <Field label="IFSC Code"><input className="hf" placeholder="HDFC0001234" value={form.ifsc} onChange={e => set("ifsc", e.target.value.toUpperCase())} /></Field>
                </div>
                <Field label="PAN Number"><input className="hf uppercase" placeholder="ABCDE1234F" maxLength={10} value={form.pan} onChange={e => set("pan", e.target.value.toUpperCase())} /></Field>
                <p className="text-xs p-3 rounded-xl" style={{ background: "var(--bg)", color: "var(--text-faint)" }}>
                  🔒 Your bank details are encrypted. You can also add them later from the dashboard.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 mt-4">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={() => validate(step) && setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm transition-colors"
              style={{ background: "var(--accent)" }}>
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-60"
              style={{ background: "var(--accent)" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</> : <><Check className="w-4 h-4" /> Register Restaurant</>}
            </button>
          )}
        </div>
        {step === 4 && <p className="text-center text-xs mt-3" style={{ color: "var(--text-faint)" }}>Bank details are optional — add them later</p>}
      </div>

      <style jsx>{`
        :global(.hf) { width: 100%; border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; font-size: 14px; color: var(--text); background: var(--bg); outline: none; transition: border-color 0.2s; }
        :global(.hf:focus) { border-color: var(--accent); }
        :global(.hf::placeholder) { color: var(--text-faint); }
        :global(.hfl) { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); display: block; margin-bottom: 6px; }
      `}</style>
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-1">
      <h2 className="font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="hfl">{label}</label>{children}</div>;
}
