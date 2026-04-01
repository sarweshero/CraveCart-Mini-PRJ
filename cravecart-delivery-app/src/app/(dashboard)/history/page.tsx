"use client";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { CheckCircle2, MapPin, Star, Package } from "lucide-react";
import { deliveryApi, type Assignment } from "@/lib/api";

export default function HistoryPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["history"],
    queryFn: ({ pageParam=1 }) => deliveryApi.getHistory(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, all) => { const f=all.flatMap(p=>p.results).length; return f<last.count?all.length+1:undefined; },
  });
  const [expanded, setExpanded] = useState<string|null>(null);
  const all = data?.pages.flatMap(p=>p.results) ?? [];

  return (
    <div className="p-4 space-y-4">
      <div><h1 className="font-display text-2xl font-bold text-ink">Delivery History</h1><p className="text-sm text-ink-muted mt-0.5">{data?.pages[0]?.count??0} completed deliveries</p></div>
      {isLoading&&<div className="space-y-3">{[0,1,2,3].map(i=><div key={i} className="card h-24 animate-pulse"/>)}</div>}
      <div className="space-y-3">
        {all.map((a,i)=>(
          <motion.div key={a.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}>
            <button onClick={()=>setExpanded(expanded===a.id?null:a.id)} className="card p-4 w-full text-left hover:border-brand/30 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-success/15 rounded-xl flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5 text-success"/></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink truncate">{a.order.restaurant_name}</div>
                    <div className="text-xs text-ink-muted flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0"/><span className="truncate">{a.order.delivery_address}</span></div>
                    <div className="text-xs text-ink-faint mt-1">{a.delivered_at?format(parseISO(a.delivered_at),"d MMM, h:mm a"):""}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-brand">₹{a.total_earning}</div>
                  {a.customer_rating&&<div className="flex items-center justify-end gap-0.5 mt-0.5">{Array.from({length:a.customer_rating}).map((_,j)=><Star key={j} className="w-2.5 h-2.5 text-brand fill-brand"/>)}</div>}
                </div>
              </div>
              {expanded===a.id&&(
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} className="mt-3 pt-3 border-t border-bg-border space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[{label:"Distance",value:`${a.distance_km}km`},{label:"Base Pay",value:`₹${a.base_earning}`,c:"text-brand"},{label:"Bonus",value:`₹${a.bonus||0}`,c:"text-success"}].map(r=>(
                      <div key={r.label} className="bg-bg-elevated rounded-xl p-2"><div className={`text-sm font-bold text-ink ${r.c??""}`}>{r.value}</div><div className="text-[10px] text-ink-muted">{r.label}</div></div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <Package className="w-3.5 h-3.5"/>{a.order.items_count} items ·<span className={a.order.payment_method==="cod"?"text-brand":"text-success"}>{a.order.payment_method==="cod"?"Cash collected":"Prepaid"}</span>
                    {a.customer_tip>0&&<span className="text-success">· ₹{a.customer_tip} tip</span>}
                  </div>
                </motion.div>
              )}
            </button>
          </motion.div>
        ))}
      </div>
      {hasNextPage&&<button onClick={()=>fetchNextPage()} disabled={isFetchingNextPage} className="w-full btn-ghost text-sm">{isFetchingNextPage?"Loading…":"Load more"}</button>}
      {all.length===0&&!isLoading&&<div className="card p-10 text-center"><div className="text-4xl mb-3">🛵</div><h3 className="font-semibold text-ink">No deliveries yet</h3><p className="text-sm text-ink-muted mt-1">Go online to start accepting deliveries.</p></div>}
    </div>
  );
}
