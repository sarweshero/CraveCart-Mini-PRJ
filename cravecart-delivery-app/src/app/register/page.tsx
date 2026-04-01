"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bike, FileText, ArrowRight, ArrowLeft, Check, Eye, EyeOff, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { deliveryAuthApi } from "@/lib/api";
import { useDeliveryStore } from "@/lib/store";

const STEPS = [{ id: 1, label: "Account", icon: User }, { id: 2, label: "Vehicle", icon: Bike }, { id: 3, label: "Verify", icon: FileText }];
const VEHICLES = [{ value: "bike", label: "Motorcycle", emoji: "🏍️" }, { value: "scooter", label: "Scooter", emoji: "🛵" }, { value: "bicycle", label: "Bicycle", emoji: "🚲" }, { value: "foot", label: "On Foot", emoji: "🚶" }];

interface F { name:string; email:string; password:string; confirm:string; phone:string; city:string; vehicle_type:string; vehicle_number:string; aadhar_number:string; }

export default function RegisterPage() {
  const router = useRouter();
  const { setPartner } = useDeliveryStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [f, setF] = useState<F>({ name:"", email:"", password:"", confirm:"", phone:"", city:"", vehicle_type:"bike", vehicle_number:"", aadhar_number:"" });
  const set = (k: keyof F, v: string) => setF(p => ({ ...p, [k]: v }));

  function validate(s: number) {
    if (s===1) { if(!f.name.trim()){toast.error("Name required");return false;} if(!f.email.includes("@")){toast.error("Valid email required");return false;} if(f.password.length<8){toast.error("Password must be 8+");return false;} if(f.password!==f.confirm){toast.error("Passwords don't match");return false;} }
    if (s===2) { if(!f.phone.trim()){toast.error("Phone required");return false;} if(!f.city.trim()){toast.error("City required");return false;} if(!f.vehicle_number.trim()){toast.error("Vehicle number required");return false;} }
    if (s===3) { if(f.aadhar_number.length!==12||!/^\d+$/.test(f.aadhar_number)){toast.error("Valid 12-digit Aadhar required");return false;} }
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await deliveryAuthApi.register({ name:f.name, email:f.email, password:f.password, phone:f.phone, city:f.city, vehicle_type:f.vehicle_type, vehicle_number:f.vehicle_number, aadhar_number:f.aadhar_number });
      setPartner(res.partner);
      toast.success("Welcome to CraveCart Delivery! 🎉");
      router.push("/home");
    } catch(e: unknown) { toast.error(e instanceof Error ? e.message : "Registration failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm mx-auto mt-8">
        <Link href="/login" className="inline-flex items-center gap-2 text-ink-muted hover:text-ink text-sm mb-8 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to login</Link>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Join as Delivery Partner</h1>
        <p className="text-ink-muted text-sm mb-8">Earn ₹500–₹1,500 per day on your schedule</p>
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s,i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step>s.id?"bg-success text-bg":step===s.id?"bg-brand text-bg shadow-brand":"bg-bg-elevated text-ink-faint border border-bg-border"}`}>
                {step>s.id?<Check className="w-4 h-4"/>:s.id}
              </div>
              {i<STEPS.length-1&&<div className={`flex-1 h-0.5 mx-2 rounded ${step>s.id?"bg-success":"bg-bg-border"}`}/>}
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}} className="card p-7 shadow-card">
            {step===1&&(
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-ink">Create account</h2>
                <LF label="Full Name"><input className="input" placeholder="Ravi Kumar" value={f.name} onChange={e=>set("name",e.target.value)}/></LF>
                <LF label="Email"><input className="input" type="email" placeholder="you@example.com" value={f.email} onChange={e=>set("email",e.target.value)}/></LF>
                <LF label="Password"><div className="relative"><input className="input pr-10" type={showPwd?"text":"password"} placeholder="8+ characters" value={f.password} onChange={e=>set("password",e.target.value)}/><button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint">{showPwd?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div></LF>
                <LF label="Confirm Password"><input className="input" type="password" placeholder="Same as above" value={f.confirm} onChange={e=>set("confirm",e.target.value)}/></LF>
              </div>
            )}
            {step===2&&(
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-ink">Delivery profile</h2>
                <LF label="Phone"><input className="input" placeholder="9876543210" value={f.phone} onChange={e=>set("phone",e.target.value)}/></LF>
                <LF label="City"><input className="input" placeholder="Coimbatore" value={f.city} onChange={e=>set("city",e.target.value)}/></LF>
                <div>
                  <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">Vehicle Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VEHICLES.map(v=>(
                      <button key={v.value} type="button" onClick={()=>set("vehicle_type",v.value)} className={`p-3 rounded-xl border text-sm font-medium transition-all ${f.vehicle_type===v.value?"border-brand bg-brand/10 text-brand":"border-bg-border text-ink-muted"}`}>
                        <span className="text-xl block mb-0.5">{v.emoji}</span>{v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <LF label="Vehicle Number"><input className="input uppercase" placeholder="TN38AB1234" value={f.vehicle_number} onChange={e=>set("vehicle_number",e.target.value.toUpperCase())}/></LF>
              </div>
            )}
            {step===3&&(
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-ink">Identity verification</h2>
                <p className="text-sm text-ink-muted">Your Aadhar number is encrypted and used only for verification.</p>
                <LF label="Aadhar Number (12 digits)"><input className="input tracking-widest" placeholder="XXXXXXXXXXXX" maxLength={12} value={f.aadhar_number} onChange={e=>set("aadhar_number",e.target.value.replace(/\D/g,""))}/></LF>
                <div className="p-3 bg-brand/8 border border-brand/20 rounded-xl text-xs text-brand/80">✓ 256-bit encrypted · used for verification only</div>
                <p className="text-xs text-ink-muted">By registering you agree to our Terms of Service and Privacy Policy.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="flex gap-3 mt-4">
          {step>1&&<button onClick={()=>setStep(s=>s-1)} className="btn-ghost flex items-center gap-2 flex-1"><ArrowLeft className="w-4 h-4"/> Back</button>}
          {step<3?<button onClick={()=>validate(step)&&setStep(s=>s+1)} className="btn-primary flex items-center justify-center gap-2 flex-1">Continue <ArrowRight className="w-4 h-4"/></button>
          :<button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center justify-center gap-2 flex-1">
            {loading?<div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin"/>:<><Check className="w-4 h-4"/> Create Account</>}
          </button>}
        </div>
        <p className="text-center text-ink-muted text-sm mt-6">Already registered? <Link href="/login" className="text-brand hover:text-brand-bright font-medium">Sign in</Link></p>
      </div>
    </div>
  );
}

function LF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5 block">{label}</label>{children}</div>;
}