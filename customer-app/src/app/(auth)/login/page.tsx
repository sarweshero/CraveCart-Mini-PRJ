"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, UtensilsCrossed, Loader2, Chrome } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setAuth(res.user as import("@/lib/types").User, res.token);
      // Set cookies for edge middleware (SSR-compatible auth check)
      document.cookie = `cravecart_token=${res.token}; path=/; SameSite=Lax; max-age=86400`;
      document.cookie = `cravecart_profile_complete=${res.user.is_profile_complete}; path=/; SameSite=Lax; max-age=86400`;
      toast.success("Welcome back! 🍽️");
      if (!res.user.is_profile_complete) router.push("/complete-profile");
      else router.push("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0E0C09]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(232,168,48,0.12),transparent_60%)]" />
        <div className="absolute inset-0 grid grid-cols-2 gap-2 p-4 opacity-25">
          {["https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400","https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400","https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400","https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"].map((src, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <img src={src} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0E0C09] to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#E8A830] flex items-center justify-center shadow-[0_0_25px_rgba(232,168,48,0.5)]">
              <UtensilsCrossed size={20} className="text-[#0C0B09]" strokeWidth={2.5} />
            </div>
            <span className="text-[#F5EDD8] font-display font-semibold text-2xl">
              Crave<span className="text-[#E8A830]">Cart</span>
            </span>
          </div>
          <h2 className="text-[#F5EDD8] font-display font-semibold text-4xl leading-tight">
            Great food,<br /><span className="text-[#E8A830] italic">delivered fast.</span>
          </h2>
          <p className="text-[#BFB49A] mt-4 text-base leading-relaxed max-w-sm">
            Order from hundreds of restaurants. Your reviews get AI-crafted responses from the restaurant.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#0C0B09]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#E8A830] flex items-center justify-center">
              <UtensilsCrossed size={16} className="text-[#0C0B09]" strokeWidth={2.5} />
            </div>
            <span className="text-[#F5EDD8] font-display font-semibold text-xl">
              Crave<span className="text-[#E8A830]">Cart</span>
            </span>
          </div>
          <h1 className="text-[#F5EDD8] font-display font-semibold text-3xl tracking-tight mb-2">Welcome back</h1>
          <p className="text-[#9E9080] text-sm mb-8">Sign in to continue ordering</p>
          <button onClick={() => authApi.googleOAuth()} className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-[#2A2620] bg-[#161410] text-[#F5EDD8] text-sm font-medium hover:border-[#E8A830]/30 hover:bg-[#161410]/80 transition-all mb-5 active:scale-[0.98]">
            <Chrome size={16} className="text-[#E8A830]" />Continue with Google
          </button>
          <div className="divider mb-5">or continue with email</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" icon={Mail} error={errors.email} />
            <div>
              <Field label="Password" type={showPassword ? "text" : "password"} value={password} onChange={setPassword} placeholder="••••••••" icon={Lock} error={errors.password}
                suffix={<button type="button" onClick={() => setShowPassword(v => !v)} className="text-[#9E9080] hover:text-[#BFB49A]">{showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}</button>} />
              <div className="text-right mt-1.5"><Link href="/forgot-password" className="text-[#E8A830] text-xs hover:underline">Forgot password?</Link></div>
            </div>
            <button type="submit" disabled={loading} className={cn("w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]", loading ? "bg-[#2A2620] text-[#9E9080] cursor-not-allowed" : "bg-[#E8A830] text-[#0C0B09] hover:bg-[#F5C842] shadow-[0_0_25px_rgba(232,168,48,0.2)] hover:shadow-[0_0_35px_rgba(232,168,48,0.3)]")}>
              {loading ? <><Loader2 size={15} className="animate-spin"/>Signing in...</> : "Sign In"}
            </button>
          </form>
          <p className="text-center text-[#9E9080] text-sm mt-6">
            Don&apos;t have an account?{" "}<Link href="/register" className="text-[#E8A830] font-medium hover:underline">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, icon: Icon, error, suffix }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string; icon: React.ElementType; error?: string; suffix?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[#BFB49A] text-xs font-medium mb-1.5">{label}</label>
      <div className={cn("flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-[#161410] transition-all", error ? "border-[#F87171]/50 shadow-[0_0_0_3px_rgba(248,113,113,0.08)]" : "border-[#2A2620] focus-within:border-[#E8A830]/50")}>
        <Icon size={15} className={error ? "text-[#F87171]" : "text-[#9E9080]"} />
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none" />
        {suffix}
      </div>
      {error && <p className="text-[#F87171] text-xs mt-1.5">{error}</p>}
    </div>
  );
}
