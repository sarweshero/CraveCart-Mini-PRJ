"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { TrendingUp, Package, Star, Calendar } from "lucide-react";
import { deliveryApi } from "@/lib/api";

export default function EarningsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["earnings"], queryFn: deliveryApi.getEarnings });
  if (isLoading) return <div className="p-4 space-y-4 animate-pulse">{[0,1,2,3].map(i=><div key={i} className="card h-24"/>)}</div>;
  if (!data) return null;
  const maxE = Math.max(...data.breakdown.map(d=>d.earnings),1);
  return (
    <div className="p-4 space-y-4">
      <div><h1 className="font-display text-2xl font-bold text-ink">Earnings</h1><p className="text-sm text-ink-muted mt-0.5">Track your delivery income</p></div>
      <div className="grid grid-cols-3 gap-2">
        {[{ label:"Today", ...data.today, color:"text-brand", bg:"bg-brand/10" }, { label:"This Week", ...data.this_week, color:"text-success", bg:"bg-success/10" }, { label:"This Month", ...data.this_month, color:"text-ink", bg:"bg-bg-elevated" }].map((s,i)=>(
          <motion.div key={s.label} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}} className={`card p-3 ${s.bg} border-0`}>
            <div className={`font-display text-xl font-bold ${s.color}`}>₹{s.earnings.toFixed(0)}</div>
            <div className="text-xs text-ink-muted mt-0.5">{s.label}</div>
            <div className="text-[10px] text-ink-faint mt-0.5">{s.deliveries} trips</div>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink">Last 7 Days</h2>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted"><TrendingUp className="w-3.5 h-3.5 text-success"/>₹{data.this_week.earnings.toFixed(0)} this week</div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.breakdown} barCategoryGap="30%">
            <XAxis dataKey="date" tickFormatter={d=>format(parseISO(d),"EEE")} tick={{fontSize:10,fill:"#4B5563"}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip cursor={false} contentStyle={{background:"#111318",border:"1px solid #1F2430",borderRadius:12,padding:"8px 12px"}} labelFormatter={d=>format(parseISO(String(d)),"EEE, d MMM")} formatter={(v:number)=>[`₹${v}`,"Earned"]} labelStyle={{color:"#9CA3AF",fontSize:11}} itemStyle={{color:"#E8A830",fontSize:13,fontWeight:600}}/>
            <Bar dataKey="earnings" radius={[6,6,0,0]}>
              {data.breakdown.map((entry,i)=><Cell key={i} fill={entry.earnings===maxE?"#E8A830":"rgba(232,168,48,0.25)"}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="card p-4">
        <h2 className="font-semibold text-ink mb-3">Earning Rates</h2>
        <div className="space-y-2.5">
          {[{label:"Base Pay",desc:"Per delivery",value:"₹25"},{label:"Distance Bonus",desc:"₹5/km after 2km",value:"Variable"},{label:"Peak Hour Bonus",desc:"12-2pm, 7-9pm",value:"+₹15"},{label:"Customer Tips",desc:"Passed 100%",value:"100%"}].map(r=>(
            <div key={r.label} className="flex items-center justify-between py-2 border-b border-bg-border last:border-0">
              <div><div className="text-sm font-medium text-ink">{r.label}</div><div className="text-xs text-ink-muted">{r.desc}</div></div>
              <div className="text-sm font-bold text-brand">{r.value}</div>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.4}} className="card p-4">
        <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-ink">Daily History</h2><Calendar className="w-4 h-4 text-ink-muted"/></div>
        <div className="space-y-2">
          {data.history.slice(0,10).map((row,i)=>(
            <motion.div key={row.date} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.4+i*0.04}} className="flex items-center justify-between py-2.5 border-b border-bg-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-bg-elevated rounded-xl flex items-center justify-center"><Package className="w-4 h-4 text-ink-muted"/></div>
                <div><div className="text-sm font-medium text-ink">{format(parseISO(row.date),"EEEE, d MMM")}</div><div className="text-xs text-ink-muted">{row.deliveries} trips · {row.online_hours}h online</div></div>
              </div>
              <div className="text-right"><div className="font-bold text-brand">₹{row.earnings}</div><div className="flex items-center justify-end gap-0.5 text-xs text-ink-muted"><Star className="w-2.5 h-2.5 text-brand fill-brand"/>{row.avg_rating}</div></div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
