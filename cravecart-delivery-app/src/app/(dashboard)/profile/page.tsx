"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Phone, MapPin, Bike, Star, Package, IndianRupee, LogOut, ChevronRight, Shield, Edit3, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { deliveryAuthApi, clearTokens } from "@/lib/api";
import { useDeliveryStore } from "@/lib/store";

export default function ProfilePage() {
  const router = useRouter();
  const { partner, setPartner, clearAuth } = useDeliveryStore();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(partner?.phone ?? "");
  const [city, setCity]   = useState(partner?.city ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try { const u = await deliveryAuthApi.updateProfile({ phone, city }); setPartner({ ...partner!, phone:u.phone, city:u.city }); setEditing(false); toast.success("Profile updated"); }
    catch { toast.error("Failed to save"); } finally { setSaving(false); }
  }

  async function handleLogout() {
    await deliveryAuthApi.logout(); clearAuth(); clearTokens(); toast("Logged out",{icon:"👋"}); router.push("/login");
  }

  if (!partner) return null;
  const vEmoji:Record<string,string> = { bike:"🏍️", scooter:"🛵", bicycle:"🚲", foot:"🚶" };

  return (
    <div className="p-4 space-y-4">
      <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} className="card p-5 text-center relative">
        <div className="relative w-20 h-20 mx-auto mb-3">
          <div className="w-20 h-20 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-3xl shadow-brand">{vEmoji[partner.vehicle_type]??"🛵"}</div>
          {partner.is_verified&&<div className="absolute -bottom-1 -right-1 w-7 h-7 bg-success rounded-full flex items-center justify-center border-2 border-bg-card"><Shield className="w-3.5 h-3.5 text-bg"/></div>}
        </div>
        <h2 className="font-display text-xl font-bold text-ink">{partner.name}</h2>
        <p className="text-sm text-ink-muted">{partner.email}</p>
        <div className="flex items-center justify-center gap-1 mt-1"><Star className="w-3.5 h-3.5 text-brand fill-brand"/><span className="text-sm font-semibold text-ink">{partner.rating_avg}</span><span className="text-xs text-ink-muted">({partner.rating_count} ratings)</span></div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-bg-border">
          {[{icon:Package,label:"Deliveries",value:String(partner.total_deliveries)},{icon:IndianRupee,label:"Total Earned",value:`₹${partner.total_earnings.toFixed(0)}`},{icon:Bike,label:"Acceptance",value:`${partner.acceptance_rate}%`}].map(({icon:Icon,label,value})=>(
            <div key={label}><div className="font-bold text-brand font-display text-lg">{value}</div><div className="text-[10px] text-ink-muted">{label}</div></div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-ink">Personal Info</h3>
          {!editing?<button onClick={()=>setEditing(true)} className="text-brand text-sm flex items-center gap-1 hover:text-brand-bright"><Edit3 className="w-3.5 h-3.5"/> Edit</button>
          :<div className="flex gap-2"><button onClick={()=>setEditing(false)} className="text-ink-muted hover:text-ink"><X className="w-4 h-4"/></button><button onClick={handleSave} disabled={saving} className="text-success">{saving?<div className="w-4 h-4 border border-current/30 border-t-current rounded-full animate-spin"/>:<Check className="w-4 h-4"/>}</button></div>}
        </div>
        <div className="space-y-3">
          {[{ icon:<Phone className="w-4 h-4"/>, label:"Phone", content:editing?<input value={phone} onChange={e=>setPhone(e.target.value)} className="input py-1.5 text-sm"/>:<span className="text-ink">{partner.phone||"—"}</span> },
            { icon:<MapPin className="w-4 h-4"/>, label:"City", content:editing?<input value={city} onChange={e=>setCity(e.target.value)} className="input py-1.5 text-sm"/>:<span className="text-ink">{partner.city||"—"}</span> },
            { icon:<Bike className="w-4 h-4"/>, label:"Vehicle", content:<span className="text-ink capitalize">{partner.vehicle_type} · {partner.vehicle_number}</span> },
            { icon:<Shield className="w-4 h-4"/>, label:"Status", content:<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${partner.is_verified?"bg-success/15 text-success":"bg-brand/15 text-brand"}`}>{partner.is_verified?"Verified":"Pending Verification"}</span> },
          ].map(row=>(
            <div key={row.label} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-bg-elevated rounded-lg flex items-center justify-center text-ink-muted shrink-0">{row.icon}</div>
              <div className="flex-1"><div className="text-xs text-ink-muted mb-0.5">{row.label}</div>{row.content}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.3}}>
        <button onClick={handleLogout} className="w-full card p-4 flex items-center gap-3 hover:border-danger/30 hover:bg-danger/5 transition-all">
          <div className="w-9 h-9 bg-danger/10 rounded-xl flex items-center justify-center"><LogOut className="w-4 h-4 text-danger"/></div>
          <span className="flex-1 text-left text-sm font-medium text-danger">Sign Out</span>
          <ChevronRight className="w-4 h-4 text-ink-faint"/>
        </button>
      </motion.div>
      <div className="text-center pb-4"><p className="text-xs text-ink-faint">CraveCart Delivery v1.0 · Partner since {partner.joined_at.split("T")[0]}</p></div>
    </div>
  );
}
