"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Smartphone, CreditCard, Banknote, Building2,
  ChevronRight, Lock, CheckCircle2, AlertCircle, Shield, Zap,
} from "lucide-react";
import { BASE_URL } from "@/lib/api";

// Read token locally — does not depend on getToken being exported
const _TOKEN_KEY = "cravecart_token";
function getAuthToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(_TOKEN_KEY) : null;
}

export interface PaymentPayload {
  order_id: string;
  amount: number;
  restaurant_name: string;
  payment_method: "upi" | "card" | "netbanking" | "cod";
  on_success: (paymentId: string) => void;
  on_fail: () => void;
}

type Step = "method" | "upi" | "card" | "netbanking" | "processing" | "success" | "failed";

export function useRazorpayPayment() {
  const [paymentPayload, setPaymentPayload] = useState<PaymentPayload | null>(null);
  const initiate = useCallback((p: PaymentPayload) => setPaymentPayload(p), []);
  const dismiss  = useCallback(() => setPaymentPayload(null), []);
  return { paymentPayload, initiate, dismiss };
}

const METHODS = [
  { id: "upi",        label: "UPI",                icon: Smartphone, badge: "Instant", badgeColor: "text-green-400 bg-green-400/10", desc: "GPay, PhonePe, Paytm, BHIM"  },
  { id: "card",       label: "Credit / Debit Card", icon: CreditCard,  badge: "Secure",  badgeColor: "text-[#E8A830] bg-[#E8A830]/10",  desc: "Visa, Mastercard, RuPay"    },
  { id: "netbanking", label: "Net Banking",          icon: Building2,   badge: null,      badgeColor: "",                                desc: "All major Indian banks"     },
  { id: "cod",        label: "Cash on Delivery",     icon: Banknote,    badge: null,      badgeColor: "",                                desc: "Pay when food arrives"      },
] as const;

export function RazorpayModal({ payload, onClose }: { payload: PaymentPayload; onClose: () => void }) {
  const [step, setStep]         = useState<Step>("method");
  const [method, setMethod]     = useState<string>(payload.payment_method);
  const [upiApp, setUpiApp]     = useState("GPay");
  const [upiId, setUpiId]       = useState("");
  const [cardNum, setCardNum]   = useState("");
  const [expiry, setExpiry]     = useState("");
  const [cvv, setCvv]           = useState("");
  const [cardName, setCardName] = useState("");
  const [bank, setBank]         = useState("HDFC Bank");
  const [payId, setPayId]       = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function processPayment() {
    if (method === "cod") {
      setStep("processing");
      await new Promise(r => setTimeout(r, 800));
      setPayId("COD_" + Math.random().toString(36).slice(2, 10).toUpperCase());
      setStep("success");
      return;
    }

    setStep("processing");
    setErrorMsg("");

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Token ${token}`;

      // Step 1: Create payment order on backend
      const initRes = await fetch(`${BASE_URL}/api/payments/initiate/`, {
        method: "POST", headers,
        body: JSON.stringify({ order_id: payload.order_id, amount: payload.amount }),
      });
      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to initiate payment");
      }
      const initData = await initRes.json();
      const rzpOrderId = initData.razorpay_order_id;

      // Step 2: Simulate payment processing (replace with Razorpay.js SDK in production)
      await new Promise(r => setTimeout(r, 1500));

      // Step 3: Verify payment with backend
      const fakePaymentId = `pay_${Date.now().toString(36).toUpperCase()}`;
      const verifyRes = await fetch(`${BASE_URL}/api/payments/verify/`, {
        method: "POST", headers,
        body: JSON.stringify({
          order_id:             payload.order_id,
          razorpay_order_id:    rzpOrderId,
          razorpay_payment_id:  fakePaymentId,
          razorpay_signature:   "demo_" + Date.now(),
        }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error(err.message ?? "Payment verification failed");
      }

      setPayId(fakePaymentId);
      setStep("success");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Payment failed. Please try again.");
      setStep("failed");
    }
  }

  const slide = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -20 },
    transition: { duration: 0.2 },
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={["method", "failed"].includes(step) ? onClose : undefined}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-sm bg-[#161410] border border-[#2A2620] rounded-3xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {!["success", "failed", "processing"].includes(step) && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2620]">
              <div>
                <div className="text-xs text-[#9E9080] uppercase tracking-wider">Secure Checkout</div>
                <div className="text-[#F5EDD8] font-semibold text-xl" className="font-display">
                  ₹{payload.amount.toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-[#9E9080]">
                  <Lock className="w-3 h-3" /> Secured
                </span>
                <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#1E1B16] flex items-center justify-center hover:bg-[#2A2620] transition-colors">
                  <X className="w-3.5 h-3.5 text-[#9E9080]" />
                </button>
              </div>
            </div>
          )}

          <div className="p-5">
            <AnimatePresence mode="wait">
              {step === "method" && (
                <motion.div key="method" {...slide}>
                  <p className="text-sm font-medium text-[#BFB49A] mb-3">Select Payment Method</p>
                  <div className="space-y-2">
                    {METHODS.map(m => (
                      <button key={m.id} onClick={() => setMethod(m.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${method === m.id ? "border-[#E8A830] bg-[#E8A830]/8" : "border-[#2A2620] hover:border-[#E8A830]/40"}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${method === m.id ? "bg-[#E8A830]/20" : "bg-[#1E1B16]"}`}>
                          <m.icon className={`w-4 h-4 ${method === m.id ? "text-[#E8A830]" : "text-[#9E9080]"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[#F5EDD8] flex items-center gap-2">
                            {m.label}
                            {m.badge && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${m.badgeColor}`}>{m.badge}</span>}
                          </div>
                          <p className="text-xs text-[#9E9080]">{m.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 transition-all ${method === m.id ? "border-[#E8A830] bg-[#E8A830]" : "border-[#2A2620]"}`} />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { if (method === "upi") setStep("upi"); else if (method === "card") setStep("card"); else if (method === "netbanking") setStep("netbanking"); else processPayment(); }}
                    className="mt-4 w-full bg-[#E8A830] hover:bg-[#F5C842] text-[#0C0B09] font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {step === "upi" && (
                <motion.div key="upi" {...slide} className="space-y-4">
                  <p className="text-sm font-medium text-[#BFB49A]">Select UPI App</p>
                  <div className="grid grid-cols-4 gap-2">
                    {["GPay", "PhonePe", "Paytm", "BHIM"].map(app => (
                      <button key={app} onClick={() => setUpiApp(app)}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${upiApp === app ? "border-[#E8A830] bg-[#E8A830]/10 text-[#E8A830]" : "border-[#2A2620] text-[#9E9080]"}`}>
                        {app === "GPay" ? "💳" : app === "PhonePe" ? "📱" : app === "Paytm" ? "💰" : "🏦"}<br />{app}
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-[#9E9080] mb-1.5">Or enter UPI ID manually</p>
                    <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@okaxis"
                      className="w-full bg-[#1E1B16] border border-[#2A2620] rounded-xl px-4 py-3 text-[#F5EDD8] placeholder-[#4B4542] focus:outline-none focus:border-[#E8A830]/60 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep("method")} className="flex-1 py-3 rounded-xl border border-[#2A2620] text-[#9E9080] text-sm">Back</button>
                    <button onClick={processPayment} className="flex-1 py-3 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm flex items-center justify-center gap-1.5">
                      <Zap className="w-4 h-4" /> Pay ₹{payload.amount.toFixed(0)}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "card" && (
                <motion.div key="card" {...slide} className="space-y-3">
                  <p className="text-sm font-medium text-[#BFB49A]">Card Details</p>
                  <input value={cardNum}
                    onChange={e => setCardNum(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())}
                    placeholder="1234 5678 9012 3456" maxLength={19}
                    className="w-full bg-[#1E1B16] border border-[#2A2620] rounded-xl px-4 py-3 text-[#F5EDD8] placeholder-[#4B4542] focus:outline-none focus:border-[#E8A830]/60 text-sm tracking-widest"
                    autoComplete="cc-number" inputMode="numeric" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={expiry}
                      onChange={e => { let v = e.target.value.replace(/\D/g, ""); if (v.length >= 2) v = v.slice(0, 2) + "/" + v.slice(2, 4); setExpiry(v); }}
                      placeholder="MM/YY" maxLength={5}
                      className="bg-[#1E1B16] border border-[#2A2620] rounded-xl px-4 py-3 text-[#F5EDD8] placeholder-[#4B4542] focus:outline-none focus:border-[#E8A830]/60 text-sm"
                      autoComplete="cc-exp" inputMode="numeric" />
                    <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="CVV" type="password" maxLength={4}
                      className="bg-[#1E1B16] border border-[#2A2620] rounded-xl px-4 py-3 text-[#F5EDD8] placeholder-[#4B4542] focus:outline-none focus:border-[#E8A830]/60 text-sm"
                      autoComplete="cc-csc" inputMode="numeric" />
                  </div>
                  <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Name on card"
                    className="w-full bg-[#1E1B16] border border-[#2A2620] rounded-xl px-4 py-3 text-[#F5EDD8] placeholder-[#4B4542] focus:outline-none focus:border-[#E8A830]/60 text-sm"
                    autoComplete="cc-name" />
                  <p className="flex items-center gap-1.5 text-xs text-[#9E9080]">
                    <Shield className="w-3 h-3" /> 256-bit SSL encrypted. Card details never stored.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setStep("method")} className="flex-1 py-3 rounded-xl border border-[#2A2620] text-[#9E9080] text-sm">Back</button>
                    <button onClick={processPayment} disabled={!cardNum || !expiry || !cvv || !cardName}
                      className="flex-1 py-3 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Pay ₹{payload.amount.toFixed(0)}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "netbanking" && (
                <motion.div key="nb" {...slide} className="space-y-3">
                  <p className="text-sm font-medium text-[#BFB49A]">Select Your Bank</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Bank", "PNB"].map(b => (
                      <button key={b} onClick={() => setBank(b)}
                        className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${bank === b ? "border-[#E8A830] bg-[#E8A830]/8 text-[#E8A830]" : "border-[#2A2620] text-[#BFB49A]"}`}>
                        🏦 {b}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep("method")} className="flex-1 py-3 rounded-xl border border-[#2A2620] text-[#9E9080] text-sm">Back</button>
                    <button onClick={processPayment} className="flex-1 py-3 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm">Pay via {bank.split(" ")[0]}</button>
                  </div>
                </motion.div>
              )}

              {step === "processing" && (
                <motion.div key="proc" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-5">
                    <div className="w-20 h-20 rounded-full border-4 border-[#2A2620]" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#E8A830] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center"><Lock className="w-7 h-7 text-[#E8A830]" /></div>
                  </div>
                  <h3 className="text-xl font-semibold text-[#F5EDD8] mb-1" className="font-display">Processing…</h3>
                  <p className="text-sm text-[#9E9080]">Communicating with {method === "upi" ? upiApp : method === "card" ? "your bank" : bank}</p>
                  <p className="text-xs text-[#4B4542] mt-2">Please do not close this window</p>
                  <div className="mt-4 flex gap-1.5 justify-center">
                    {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#E8A830] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-[#F5EDD8]" className="font-display">Payment Successful!</h3>
                  <p className="text-[#9E9080] text-sm mt-1">
                    {method === "cod" ? `Pay ₹${payload.amount.toFixed(0)} when your order arrives.` : `₹${payload.amount.toFixed(0)} paid successfully.`}
                  </p>
                  {payId && (
                    <div className="mt-3 bg-[#1E1B16] rounded-xl p-3 select-all cursor-text">
                      <div className="text-[10px] text-[#9E9080] uppercase tracking-wider">Transaction ID</div>
                      <div className="text-xs font-mono text-[#E8A830] mt-0.5 break-all">{payId}</div>
                    </div>
                  )}
                  <button onClick={() => { payload.on_success(payId); onClose(); }}
                    className="mt-5 w-full bg-[#E8A830] text-[#0C0B09] font-semibold rounded-xl py-3.5 hover:bg-[#F5C842] transition-colors">
                    Track My Order →
                  </button>
                </motion.div>
              )}

              {step === "failed" && (
                <motion.div key="fail" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-[#F5EDD8]" className="font-display">Payment Failed</h3>
                  <p className="text-[#9E9080] text-sm mt-1">No money was deducted from your account.</p>
                  {errorMsg && <p className="text-red-400/80 text-xs mt-2 px-4">{errorMsg}</p>}
                  <div className="flex gap-2 mt-5">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#2A2620] text-[#9E9080] text-sm">Cancel</button>
                    <button onClick={() => { setStep("method"); setErrorMsg(""); }} className="flex-1 py-3 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm">Try Again</button>
                  </div>
                  {method !== "cod" && (
                    <button
                      onClick={() => { setMethod("cod"); setStep("method"); setErrorMsg(""); }}
                      className="mt-2 w-full text-xs text-[#9E9080] hover:text-[#BFB49A] transition-colors">
                      Switch to Cash on Delivery instead
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
