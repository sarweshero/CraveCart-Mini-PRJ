"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", confirm_password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!validate()) return; setLoading(true);
    try {
      await authApi.register(form);
      toast.success("Account created! Please complete your profile.");
      router.push("/complete-profile");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Registration failed"); }
    finally { setLoading(false); }
  };
  const strength = (() => { const p = form.password; if (!p) return 0; let s = 0; if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return s; })();
  const strengthColors = ["","#F87171","#FBBF24","#60A5FA","#4ADE80"];
  const strengthLabels = ["","Weak","Fair","Good","Strong"];
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0B09] px-6 py-12">
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.5}} className="w-full max-w-sm">
        <BrandLogo href="/" width={144} className="mb-10 inline-flex" />
        <h1 className="text-[#F5EDD8] font-display font-semibold text-3xl mb-2">Create account</h1>
        <p className="text-[#9E9080] text-sm mb-8">Join thousands of food lovers</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[{k:"email",label:"Email address",type:"email",ph:"you@example.com",Icon:Mail},{k:"password",label:"Password",type:showPwd?"text":"password",ph:"Min. 8 characters",Icon:Lock},{k:"confirm_password",label:"Confirm password",type:"password",ph:"••••••••",Icon:ShieldCheck}].map(({k,label,type,ph,Icon})=>(
            <div key={k}>
              <label className="block text-[#BFB49A] text-xs font-medium mb-1.5">{label}</label>
              <div className={cn("flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-[#161410] transition-colors",errors[k]?"border-[#F87171]/50":"border-[#2A2620] focus-within:border-[#E8A830]/50")}>
                <Icon size={15} className={errors[k]?"text-[#F87171]":"text-[#9E9080]"}/>
                <input type={type} value={form[k as keyof typeof form]} onChange={e=>set(k)(e.target.value)} placeholder={ph} className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none"/>
                {k==="password" && <button type="button" onClick={()=>setShowPwd(v=>!v)} className="text-[#9E9080]">{showPwd?<EyeOff size={15}/>:<Eye size={15}/>}</button>}
              </div>
              {k==="password" && form.password && (<div className="mt-2 flex items-center gap-2"><div className="flex gap-1 flex-1">{[1,2,3,4].map(i=><div key={i} className="h-1 flex-1 rounded-full" style={{background:i<=strength?strengthColors[strength]:"#2A2620"}}/>)}</div><span className="text-xs font-medium" style={{color:strengthColors[strength]}}>{strengthLabels[strength]}</span></div>)}
              {errors[k] && <p className="text-[#F87171] text-xs mt-1.5">{errors[k]}</p>}
            </div>
          ))}
          <button type="submit" disabled={loading} className={cn("w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all mt-2",loading?"bg-[#2A2620] text-[#9E9080] cursor-not-allowed":"bg-[#E8A830] text-[#0C0B09] hover:bg-[#F5C842]")}>
            {loading?<><Loader2 size={15} className="animate-spin"/>Creating...</>:"Create Account"}
          </button>
        </form>
        <p className="text-center text-[#9E9080] text-sm mt-6">Already have an account?{" "}<Link href="/login" className="text-[#E8A830] font-medium hover:underline">Sign in</Link></p>
      </motion.div>
    </div>
  );
}
