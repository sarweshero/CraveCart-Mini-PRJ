"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Phone, MapPin, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: "", phone: "", line1: "", city: "", state: "", pincode: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPrefilled, setIsPrefilled] = useState(false);
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (user) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("cravecart_token") : null;
    if (!token) return;

    let active = true;
    (async () => {
      try {
        const latestUser = await authApi.me();
        if (!active) return;
        setAuth(latestUser, token);
      } catch {
        // Best-effort hydration; normal submit flow still works without prefill.
      }
    })();

    return () => {
      active = false;
    };
  }, [user, setAuth]);

  useEffect(() => {
    if (!user || isPrefilled) return;

    const defaultAddress = user.addresses?.find((addr) => addr.is_default) ?? user.addresses?.[0];
    setForm((prev) => ({
      ...prev,
      name: user.name || prev.name,
      phone: user.phone || prev.phone,
      line1: defaultAddress?.line1 || prev.line1,
      city: defaultAddress?.city || prev.city,
      state: defaultAddress?.state || prev.state,
      pincode: defaultAddress?.pincode || prev.pincode,
    }));
    setIsPrefilled(true);
  }, [user, isPrefilled]);

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g,""))) e.phone = "Enter a valid Indian mobile number";

    const hasAnyAddressField = [form.line1, form.city, form.state, form.pincode].some((v) => v.trim().length > 0);
    if (hasAnyAddressField) {
      if (!form.line1.trim()) e.line1 = "Address line is required";
      if (!form.city.trim()) e.city = "City is required";
      if (!form.state.trim()) e.state = "State is required";
      if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Pincode must be 6 digits";
    }

    setErrors(e); return Object.keys(e).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!validate()) return; setLoading(true);
    try {
      const payload: Parameters<typeof authApi.completeProfile>[0] = {
        name: form.name,
        phone: form.phone,
      };

      const hasCompleteAddress = [form.line1, form.city, form.state, form.pincode].every((v) => v.trim().length > 0);
      if (hasCompleteAddress) {
        payload.address = {
          label: "Home",
          line1: form.line1.trim(),
          line2: "",
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          is_default: true,
        };
      }

      const response = await authApi.completeProfile(payload);
      const token = typeof window !== "undefined" ? localStorage.getItem("cravecart_token") : null;
      if (token) {
        setAuth(response.user, token);
      }
      toast.success("Profile complete! Welcome to CraveCart");
      router.replace("/");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to save profile"); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0B09] px-6 py-12">
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} className="w-full max-w-sm">
        <BrandLogo href="/" width={144} className="mb-10 inline-flex" />
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2"><div className="flex gap-1">{[1,2].map(i=><div key={i} className="h-1 w-8 rounded-full" style={{background:i===1?"#E8A830":"#2A2620"}}/>)}</div><span className="text-[#9E9080] text-xs">Step 1 of 2</span></div>
          <h1 className="text-[#F5EDD8] font-display font-semibold text-3xl">Complete your profile</h1>
          <p className="text-[#9E9080] text-sm mt-2">We need a few more details to get you started</p>
          {user?.avatar && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#2A2620] bg-[#161410] px-4 py-3">
              <img src={user.avatar} alt={user.name || "Google profile"} className="h-12 w-12 rounded-full object-cover" />
              <div>
                <p className="text-[#F5EDD8] text-sm font-medium">{user.name || "Google account"}</p>
                <p className="text-[#9E9080] text-xs">Imported from Google</p>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[{k:"name",label:"Full Name",type:"text",ph:"Arjun Kumar",Icon:User},{k:"phone",label:"Phone Number",type:"tel",ph:"+91 98765 43210",Icon:Phone}].map(({k,label,type,ph,Icon})=>(
            <div key={k}>
              <label className="block text-[#BFB49A] text-xs font-medium mb-1.5">{label}<span className="text-[#E8A830] ml-0.5">*</span></label>
              <div className={cn("flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-[#161410] transition-colors",errors[k]?"border-[#F87171]/50":"border-[#2A2620] focus-within:border-[#E8A830]/50")}>
                <Icon size={15} className={errors[k]?"text-[#F87171]":"text-[#9E9080]"}/>
                <input type={type} value={form[k as keyof typeof form]} onChange={e=>set(k)(e.target.value)} placeholder={ph} className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none"/>
              </div>
              {errors[k] && <p className="text-[#F87171] text-xs mt-1.5">{errors[k]}</p>}
            </div>
          ))}
          <div>
            <label className="block text-[#BFB49A] text-xs font-medium mb-1.5">Home Address <span className="text-[#9E9080]">(optional)</span></label>
            <div className="space-y-2">
              <div className={cn("flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-[#161410] focus-within:border-[#E8A830]/50 transition-colors", errors.line1 ? "border-[#F87171]/50" : "border-[#2A2620]")}>
                <MapPin size={15} className="text-[#9E9080]"/>
                <input type="text" value={form.line1} onChange={e=>set("line1")(e.target.value)} placeholder="Street address" className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none"/>
              </div>
              {errors.line1 && <p className="text-[#F87171] text-xs mt-1.5">{errors.line1}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <input type="text" value={form.city} onChange={e=>set("city")(e.target.value)} placeholder="City" className={cn("w-full px-4 py-3 rounded-xl border bg-[#161410] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/50 transition-colors", errors.city ? "border-[#F87171]/50" : "border-[#2A2620]")}/>
                  {errors.city && <p className="text-[#F87171] text-xs mt-1.5">{errors.city}</p>}
                </div>
                <div>
                  <input type="text" value={form.state} onChange={e=>set("state")(e.target.value)} placeholder="State" className={cn("w-full px-4 py-3 rounded-xl border bg-[#161410] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/50 transition-colors", errors.state ? "border-[#F87171]/50" : "border-[#2A2620]")}/>
                  {errors.state && <p className="text-[#F87171] text-xs mt-1.5">{errors.state}</p>}
                </div>
                <div>
                  <input type="text" value={form.pincode} onChange={e=>set("pincode")(e.target.value)} placeholder="Pincode" className={cn("w-full px-4 py-3 rounded-xl border bg-[#161410] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/50 transition-colors", errors.pincode ? "border-[#F87171]/50" : "border-[#2A2620]")}/>
                  {errors.pincode && <p className="text-[#F87171] text-xs mt-1.5">{errors.pincode}</p>}
                </div>
              </div>
            </div>
          </div>
          <button type="submit" disabled={loading} className={cn("w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all mt-2",loading?"bg-[#2A2620] text-[#9E9080] cursor-not-allowed":"bg-[#E8A830] text-[#0C0B09] hover:bg-[#F5C842] shadow-[0_0_25px_rgba(232,168,48,0.2)]")}>
            {loading?<><Loader2 size={15} className="animate-spin"/>Saving...</>:"Continue →"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
