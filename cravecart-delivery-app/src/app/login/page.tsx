"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Bike, ArrowRight, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { deliveryAuthApi } from "@/lib/api";
import { useDeliveryStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setPartner } = useDeliveryStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await deliveryAuthApi.login(email, password);
      setPartner(res.partner);
      toast.success("Welcome back! 🚀");
      router.push("/home");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <div className="w-16 h-16 bg-brand/15 border border-brand/30 rounded-2xl flex items-center justify-center shadow-brand">
              <Bike className="w-8 h-8 text-brand" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-bg fill-current" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">CraveCart <span className="text-brand">Delivery</span></h1>
          <p className="text-ink-muted text-sm mt-1">Deliver food. Earn more.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full max-w-sm">
          <div className="card p-8 shadow-card">
            <h2 className="text-xl font-semibold text-ink mb-6">Sign in to your account</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5 block">Email</label>
                <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" /><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="input pl-10" required /></div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5 block">Password</label>
                <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" /><input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="input pl-10 pr-10" required /><button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint">{show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {loading?<div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin"/>:<>Sign In <ArrowRight className="w-4 h-4"/></>}
              </button>
            </form>
            <div className="mt-4 p-3 bg-brand/8 border border-brand/20 rounded-xl text-center text-xs text-brand/80"><span className="font-semibold">Demo:</span> any email + password works in mock mode</div>
          </div>
          <p className="text-center text-ink-muted text-sm mt-6">New partner? <Link href="/register" className="text-brand hover:text-brand-bright font-medium">Register here</Link></p>
        </motion.div>
      </div>
    </div>
  );
}
