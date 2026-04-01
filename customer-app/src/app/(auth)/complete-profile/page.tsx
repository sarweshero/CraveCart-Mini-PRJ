"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Phone, MapPin, Loader2, UtensilsCrossed } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { updateUser } = useAuthStore();
  const [form, setForm] = useState({ name: "", phone: "", line1: "", city: "", pincode: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g,""))) e.phone = "Enter a valid Indian mobile number";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!validate()) return; setLoading(true);
    try {
      await authApi.completeProfile({ name: form.name, phone: form.phone });
      updateUser({ name: form.name, phone: form.phone, is_profile_complete: true });
      toast.success("Profile complete! Welcome to CraveCart 🎉");
      router.push("/");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to save profile"); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0B09] px-6 py-12">
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-[#E8A830] flex items-center justify-center"><UtensilsCrossed size={16} className="text-[#0C0B09]" strokeWidth={2.5}/></div>
          <span className="text-[#F5EDD8] font-display font-semibold text-xl">Crave<span className="text-[#E8A830]">Cart</span></span>
        </div>
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2"><div className="flex gap-1">{[1,2].map(i=><div key={i} className="h-1 w-8 rounded-full" style={{background:i===1?"#E8A830":"#2A2620"}}/>)}</div><span className="text-[#9E9080] text-xs">Step 1 of 2</span></div>
          <h1 className="text-[#F5EDD8] font-display font-semibold text-3xl">Complete your profile</h1>
          <p className="text-[#9E9080] text-sm mt-2">We need a few more details to get you started</p>
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
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#2A2620] bg-[#161410] focus-within:border-[#E8A830]/50 transition-colors">
                <MapPin size={15} className="text-[#9E9080]"/>
                <input type="text" value={form.line1} onChange={e=>set("line1")(e.target.value)} placeholder="Street address" className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={form.city} onChange={e=>set("city")(e.target.value)} placeholder="City" className="px-4 py-3 rounded-xl border border-[#2A2620] bg-[#161410] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/50 transition-colors"/>
                <input type="text" value={form.pincode} onChange={e=>set("pincode")(e.target.value)} placeholder="Pincode" className="px-4 py-3 rounded-xl border border-[#2A2620] bg-[#161410] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/50 transition-colors"/>
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
