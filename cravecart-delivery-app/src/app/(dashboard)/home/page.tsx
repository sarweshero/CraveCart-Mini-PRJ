"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Power, CheckCircle2, Package, IndianRupee, Star, Zap, MapPin, Bike } from "lucide-react";
import toast from "react-hot-toast";
import { deliveryApi, deliveryAuthApi, type Assignment } from "@/lib/api";
import { useDeliveryStore } from "@/lib/store";

function CountdownRing({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const [left, setLeft] = useState(60);
  useEffect(() => {
    function update() {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime()-Date.now())/1000));
      setLeft(remaining);
      if (remaining === 0 && onExpire) onExpire();
    }
    update();
    const t = setInterval(update, 500);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);
  const r=36, circ=2*Math.PI*r, dash=(left/60)*circ, urgent=left<=15;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="80" height="80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1F2430" strokeWidth="4"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={urgent?"#EF4444":"#E8A830"} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ-dash} style={{transition:"stroke-dashoffset 0.5s linear"}}/>
      </svg>
      <div className="text-center"><div className={`text-2xl font-bold font-display leading-none ${urgent?"text-danger":"text-brand"}`}>{left}</div><div className="text-[9px] text-ink-muted uppercase">sec</div></div>
    </div>
  );
}

export default function HomePage() {
  const { partner, isOnline, setOnline, setPartner } = useDeliveryStore();
  const [activeData, setActiveData] = useState<{ type: string; assignment?: Assignment }|null>(null);
  const [toggling, setToggling] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [actioning, setActioning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const poll = useCallback(async () => {
    try { const d = await deliveryApi.getActive(); setActiveData(d); } catch {}
  }, []);

  useEffect(() => {
    if (isOnline) { poll(); pollRef.current = setInterval(poll, 3000); }
    else { setActiveData(null); if (pollRef.current) clearInterval(pollRef.current); }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOnline, poll]);

  async function handleToggle() {
    setToggling(true);
    try { const r = await deliveryAuthApi.toggleOnline(); setOnline(r.is_online); toast.success(r.message); }
    catch { toast.error("Failed to update status"); } finally { setToggling(false); }
  }

  async function handleAccept(id: string) {
    setAccepting(true);
    try { await deliveryApi.accept(id); toast.success("Delivery accepted! Head to the restaurant. 🛵"); poll(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setAccepting(false); }
  }

  async function handleReject(id: string) {
    try { await deliveryApi.reject(id); toast("Assignment rejected", { icon: "👋" }); poll(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function handlePickup(id: string) {
    setActioning(true);
    try { await deliveryApi.pickup(id); toast.success("Picked up! Head to customer. 📦"); poll(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setActioning(false); }
  }

  async function handleDeliver(id: string) {
    setActioning(true);
    try {
      const r = await deliveryApi.deliver(id);
      toast.success(`Delivered! You earned ₹${r.earning} 🎉`);
      if (partner) setPartner({ ...partner, today_deliveries: partner.today_deliveries + 1, today_earnings: Number(partner.today_earnings) + Number(r.earning), total_earnings: Number(partner.total_earnings) + Number(r.earning), total_deliveries: partner.total_deliveries + 1 });
      poll();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setActioning(false); }
  }

  const assignment = activeData?.assignment;
  const isIdle     = !activeData || activeData.type === "idle";
  const isIncoming = activeData?.type === "incoming";
  const isActive   = activeData?.type === "active";

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[{ label: "Today Trips", value: String(partner?.today_deliveries??0), color: "text-brand" }, { label: "Today Earned", value: `₹${(partner?.today_earnings??0).toFixed(0)}`, color: "text-success" }, { label: "Acceptance", value: `${partner?.acceptance_rate??100}%`, color: "text-ink" }].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <div className={`text-xl font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ink-muted mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Online toggle */}
      <div className={`card p-5 transition-all duration-500 ${isOnline?"border-success/30 shadow-success":""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink text-lg">{isOnline?"You're Online":"You're Offline"}</h2>
            <p className="text-sm text-ink-muted mt-0.5">{isOnline?"Waiting for delivery requests…":"Go online to start earning"}</p>
          </div>
          <button onClick={handleToggle} disabled={toggling} className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${isOnline?"bg-success hover:bg-success/90 shadow-success":"bg-bg-elevated hover:bg-bg-border border-2 border-bg-border"}`}>
            {toggling?<div className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin"/>:<Power className={`w-7 h-7 ${isOnline?"text-bg":"text-ink-muted"}`}/>}
            {isOnline&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full"><span className="absolute inset-0 bg-success rounded-full animate-ping opacity-75"/></span>}
          </button>
        </div>
        {isOnline&&isIdle&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} className="mt-4 pt-4 border-t border-bg-border flex items-center gap-3">
            <div className="flex-1 bg-bg-elevated rounded-xl p-3 flex items-center gap-2 text-sm text-ink-muted"><div className="w-2 h-2 bg-success rounded-full animate-pulse"/>Looking for orders near you…</div>
          </motion.div>
        )}
      </div>

      {/* Incoming request */}
      <AnimatePresence>
        {isIncoming&&assignment&&(
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="card p-5 border-brand/40 shadow-brand">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-brand mb-0.5">New Delivery Request</div>
                <h3 className="font-display text-xl font-bold text-ink">Incoming Order</h3>
              </div>
              {assignment.expires_at&&<CountdownRing expiresAt={assignment.expires_at} onExpire={()=>handleReject(assignment.id)}/>}
            </div>
            <div className="bg-brand/10 border border-brand/25 rounded-xl p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><IndianRupee className="w-5 h-5 text-brand"/><div><div className="font-bold text-brand text-xl font-display">₹{assignment.total_earning}</div><div className="text-xs text-ink-muted">estimated earning</div></div></div>
              <div className="text-right text-sm"><div className="font-medium text-ink">{assignment.distance_km} km</div><div className="text-xs text-ink-muted">distance</div></div>
            </div>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5"/><div><div className="font-medium text-ink">{assignment.order.restaurant_name}</div><div className="text-ink-muted">{assignment.order.restaurant_address}</div></div></div>
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-success shrink-0 mt-0.5"/><div><div className="font-medium text-ink">{assignment.order.customer_name}</div><div className="text-ink-muted">{assignment.order.delivery_address}</div></div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>handleReject(assignment.id)} className="btn-ghost py-3">Decline</button>
              <button onClick={()=>handleAccept(assignment.id)} disabled={accepting} className="btn-primary py-3 flex items-center justify-center gap-2">
                {accepting?<div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin"/>:"Accept"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active delivery */}
      <AnimatePresence>
        {isActive&&assignment&&(
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="space-y-3">
            {/* Progress */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Active Delivery</h3>
                <div className="flex items-center gap-1 text-xs text-success"><div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"/>In Progress</div>
              </div>
              <div className="flex items-center">
                {[{s:"accepted",l:"Accepted"},{s:"picked_up",l:"Picked Up"},{s:"delivered",l:"Delivered"}].map((st,i,arr)=>{
                  const idx=["accepted","picked_up","delivered"].indexOf(assignment.status);
                  const done=i<=idx; const active=i===idx;
                  return (<div key={st.s} className="flex items-center flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${i<idx?"bg-success text-bg":active?"bg-brand text-bg shadow-brand":"bg-bg-border text-ink-faint"}`}>
                      {i<idx?<CheckCircle2 className="w-4 h-4"/>:i+1}
                    </div>
                    <div className="ml-1"><div className={`text-[10px] font-medium ${done?"text-ink":"text-ink-faint"}`}>{st.l}</div></div>
                    {i<arr.length-1&&<div className={`flex-1 h-0.5 mx-2 rounded ${i<idx?"bg-success":"bg-bg-border"}`}/>}
                  </div>);
                })}
              </div>
            </div>
            {/* Details */}
            <div className="card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div><h3 className="font-semibold text-ink">{assignment.order.restaurant_name}</h3><div className="flex items-center gap-1 text-sm text-ink-muted mt-0.5"><MapPin className="w-3.5 h-3.5"/>{assignment.order.restaurant_address}</div></div>
                <div className="text-right"><div className="text-brand font-bold font-display text-lg">₹{assignment.total_earning}</div><div className="text-xs text-ink-muted">earning</div></div>
              </div>
              <div className="h-px bg-bg-border"/>
              <div><div className="text-sm font-medium text-ink mb-1 flex items-center gap-1.5"><Package className="w-4 h-4 text-brand"/>Deliver to: {assignment.order.customer_name}</div><div className="flex items-start gap-1 text-sm text-ink-muted"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0"/><span>{assignment.order.delivery_address}</span></div></div>
              {assignment.status==="accepted"?(
                <button onClick={()=>handlePickup(assignment.id)} disabled={actioning} className="w-full btn-primary flex items-center justify-center gap-2">
                  {actioning?<div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin"/>:<><Package className="w-4 h-4"/> Confirm Pickup</>}
                </button>
              ):assignment.status==="picked_up"?(
                <button onClick={()=>handleDeliver(assignment.id)} disabled={actioning} className="w-full bg-success hover:bg-success/90 text-bg font-semibold rounded-xl px-6 py-3.5 flex items-center justify-center gap-2 transition-all shadow-success">
                  {actioning?<div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin"/>:<><CheckCircle2 className="w-4 h-4"/> Mark as Delivered</>}
                </button>
              ):null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline placeholder */}
      {!isOnline&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="card p-8 text-center">
          <div className="w-16 h-16 bg-bg-elevated rounded-2xl flex items-center justify-center mx-auto mb-4"><Bike className="w-8 h-8 text-ink-faint"/></div>
          <h3 className="font-semibold text-ink mb-1">Ready to earn?</h3>
          <p className="text-sm text-ink-muted">Go online to start receiving delivery requests.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-brand/8 rounded-xl"><div className="text-brand font-bold text-lg font-display">₹{(partner?.total_earnings??0).toFixed(0)}</div><div className="text-xs text-ink-muted">Total Earned</div></div>
            <div className="p-3 bg-bg-elevated rounded-xl"><div className="text-ink font-bold text-lg font-display">{partner?.total_deliveries??0}</div><div className="text-xs text-ink-muted">Total Trips</div></div>
          </div>
        </motion.div>
      )}

      {/* Performance */}
      {partner&&(
        <div className="card p-4">
          <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider mb-3">Performance</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5"><div className="w-9 h-9 bg-brand/15 rounded-xl flex items-center justify-center"><Star className="w-4 h-4 text-brand fill-brand"/></div><div><div className="font-semibold text-ink">{partner.rating_avg}</div><div className="text-xs text-ink-muted">{partner.rating_count} ratings</div></div></div>
            <div className="flex items-center gap-2.5"><div className="w-9 h-9 bg-success/15 rounded-xl flex items-center justify-center"><Zap className="w-4 h-4 text-success"/></div><div><div className="font-semibold text-ink">{partner.acceptance_rate}%</div><div className="text-xs text-ink-muted">Acceptance</div></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
