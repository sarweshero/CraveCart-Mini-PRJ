"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, Store } from "lucide-react";
import { hotelAuthApi } from "@/lib/api";
import { useHotelAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import { BrandLogo } from "@/components/brand/brand-logo";

function HotelLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useHotelAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill all fields"); return; }
    setLoading(true);
    try {
      const res = await hotelAuthApi.login(email, password);
      setAuth(res.hotel, res.token);
      // Set cookie for edge middleware auth check
      document.cookie = `cravecart_hotel_token=${res.token}; path=/; SameSite=Lax; max-age=86400`;
      toast.success(`Welcome back, ${res.hotel.owner_name || "Partner"}!`);
      const redirect = searchParams.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        router.push(redirect);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Invalid credentials"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{background:"var(--bg)"}}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between bg-[#1C1917] p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(217,119,6,0.15),transparent_60%)]"/>
        <div className="relative">
          <BrandLogo href="/login" width={170} className="inline-flex mb-16" />
          <h2 className="text-white font-display font-semibold text-4xl leading-tight tracking-tight">Restaurant<br/><span style={{color:"#D97706",fontStyle:"italic"}}>Partner Portal</span></h2>
          <p className="text-stone-400 mt-5 text-base leading-relaxed max-w-xs">Manage orders, update menus, and let AI craft personalized responses to every customer review.</p>
        </div>
        <div className="relative space-y-4">
          {[{icon:"📦",label:"Manage incoming orders in real time"},
            {icon:"✨",label:"AI-powered responses to every review"},
            {icon:"📊",label:"Revenue analytics and insights"},
            {icon:"🍽️",label:"Live menu availability control"}].map(({icon,label})=>(
            <div key={label} className="flex items-center gap-3 text-stone-400 text-sm"><span className="text-lg">{icon}</span>{label}</div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="w-full max-w-sm">
          <BrandLogo href="/login" width={148} className="inline-flex mb-10 lg:hidden" />
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg" style={{background:"var(--accent-light)",display:"flex",alignItems:"center",justifyContent:"center"}}><Store size={16} style={{color:"var(--accent)"}}/></div>
            <span className="text-sm font-medium" style={{color:"var(--accent)"}}>Hotel Partner Login</span>
          </div>
          <h1 className="font-display font-semibold text-3xl mb-2 tracking-tight">Sign in to dashboard</h1>
          <p className="text-sm mb-8" style={{color:"var(--text-muted)"}}>Manage your restaurant from anywhere</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:"var(--text-muted)"}}>Email address</label>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border" style={{borderColor:"var(--border)",background:"var(--bg-card)"}}>
                <Mail size={15} style={{color:"var(--text-faint)"}}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="restaurant@example.com" className="flex-1 bg-transparent text-sm outline-none" style={{color:"var(--text)"}}/>
              </div>
            </div>
            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:"var(--text-muted)"}}>Password</label>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border" style={{borderColor:"var(--border)",background:"var(--bg-card)"}}>
                <Lock size={15} style={{color:"var(--text-faint)"}}/><input type={showPwd?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="flex-1 bg-transparent text-sm outline-none" style={{color:"var(--text)"}}/>
                <button type="button" onClick={()=>setShowPwd(v=>!v)} style={{color:"var(--text-faint)"}}>{showPwd?<EyeOff size={15}/>:<Eye size={15}/>}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className={cn("w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all text-white active:scale-[0.98]",loading?"opacity-60 cursor-not-allowed":"shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:shadow-[0_0_30px_rgba(124,58,237,0.35)]")} style={{background:loading?"var(--border)":"var(--accent)"}}>
              {loading?<><Loader2 size={15} className="animate-spin"/>Signing in...</>:"Sign In"}
            </button>
          </form>
          <p className="text-center text-sm mt-4" style={{ color: "var(--text-muted)" }}>
            New hotel?{" "}
            <Link href="/register" className="font-semibold transition-colors" style={{ color: "var(--accent)" }}>Register your restaurant</Link>
          </p>
          <p className="text-xs text-center mt-6" style={{color:"var(--text-faint)"}}>Having trouble? Contact <a href="mailto:support@cravecart.in" style={{color:"var(--accent)"}}>support@cravecart.in</a></p>
        </motion.div>
      </div>
    </div>
  );
}

export default function HotelLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{background:"var(--bg)"}} />}>
      <HotelLoginContent />
    </Suspense>
  );
}
