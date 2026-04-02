"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { BASE_URL, cartApi } from "@/lib/api";
import { useCartStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

type PaymentStep = "processing" | "success" | "failed" | "invalid";

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("cravecart_token") : null;
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const search = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);

  const orderId = search.get("order_id") ?? "";
  const method = (search.get("method") ?? "upi").toLowerCase();
  const amount = Number(search.get("amount") ?? "0");

  const [step, setStep] = useState<PaymentStep>("processing");
  const [message, setMessage] = useState("Connecting to your bank...");
  const [paymentId, setPaymentId] = useState("");
  const redirected = useRef(false);

  const isValid = useMemo(() => Boolean(orderId) && Number.isFinite(amount) && amount > 0, [orderId, amount]);

  useEffect(() => {
    if (!isValid) {
      setStep("invalid");
      return;
    }

    let cancelled = false;

    const redirectToOrder = (status: "success" | "failed") => {
      if (redirected.current || cancelled) return;
      redirected.current = true;
      const params = new URLSearchParams({ payment: status });
      router.replace(`/orders/${orderId}?${params.toString()}`);
    };

    const run = async () => {
      if (method === "cod") {
        setMessage("Cash on Delivery selected. Confirming your order...");
        setTimeout(() => {
          if (!cancelled) {
            clearCart();
            cartApi.clear().catch(() => {});
            setStep("success");
            setMessage("Order placed successfully. Pay when your order arrives.");
            setTimeout(() => redirectToOrder("success"), 1700);
          }
        }, 1200);
        return;
      }

      try {
        const token = getToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Token ${token}`;

        setMessage("Creating secure payment session...");
        const initRes = await fetch(`${BASE_URL}/api/payments/initiate/`, {
          method: "POST",
          headers,
          body: JSON.stringify({ order_id: orderId, amount }),
        });

        if (!initRes.ok) {
          const err = await initRes.json().catch(() => ({}));
          throw new Error(err.message ?? "Could not initiate payment.");
        }

        const initData = await initRes.json();
        const razorpayOrderId = initData.razorpay_order_id as string;

        setMessage("Authorizing payment...");
        await new Promise((resolve) => setTimeout(resolve, 1400));

        const fakePaymentId = `pay_${Date.now().toString(36).toUpperCase()}`;
        const verifyRes = await fetch(`${BASE_URL}/api/payments/verify/`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            order_id: orderId,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: fakePaymentId,
            razorpay_signature: `demo_${Date.now()}`,
          }),
        });

        if (!verifyRes.ok) {
          const err = await verifyRes.json().catch(() => ({}));
          throw new Error(err.message ?? "Payment verification failed.");
        }

        if (!cancelled) {
          setPaymentId(fakePaymentId);
          setStep("success");
          setMessage("Payment successful. Redirecting to order tracking...");
          clearCart();
          cartApi.clear().catch(() => {});
          setTimeout(() => redirectToOrder("success"), 1700);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setStep("failed");
          setMessage(err instanceof Error ? err.message : "Payment failed. Redirecting to order details...");
          setTimeout(() => redirectToOrder("failed"), 2200);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [amount, clearCart, isValid, method, orderId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#161410] border border-[#2A2620] rounded-3xl p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
      >
        {step === "processing" && (
          <>
            <div className="mx-auto w-20 h-20 rounded-full border-2 border-[#2A2620] flex items-center justify-center mb-4">
              <Loader2 className="w-9 h-9 text-[#E8A830] animate-spin" />
            </div>
            <h1 className="text-[#F5EDD8] text-xl font-semibold">Processing Payment</h1>
            <p className="text-[#9E9080] text-sm mt-2">{message}</p>
            <p className="text-[#BFB49A] text-sm mt-4">Amount: <span className="text-[#E8A830] font-semibold">{formatCurrency(amount)}</span></p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs text-[#9E9080]">
              <ShieldCheck size={13} /> Secured with bank-grade encryption
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-[#4ADE80]" />
            </div>
            <h1 className="text-[#F5EDD8] text-xl font-semibold">Payment Successful</h1>
            <p className="text-[#9E9080] text-sm mt-2">{message}</p>
            {paymentId && (
              <div className="mt-4 p-3 rounded-xl bg-[#1E1B16] border border-[#2A2620]">
                <p className="text-[10px] uppercase tracking-wider text-[#9E9080]">Transaction ID</p>
                <p className="text-[#E8A830] text-xs font-mono mt-1 break-all">{paymentId}</p>
              </div>
            )}
          </>
        )}

        {step === "failed" && (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-[#F87171]/10 border border-[#F87171]/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-[#F87171]" />
            </div>
            <h1 className="text-[#F5EDD8] text-xl font-semibold">Payment Failed</h1>
            <p className="text-[#9E9080] text-sm mt-2">{message}</p>
            <p className="text-[#BFB49A] text-xs mt-3">Your order is saved. You can retry payment from order details.</p>
          </>
        )}

        {step === "invalid" && (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-[#F87171]/10 border border-[#F87171]/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-[#F87171]" />
            </div>
            <h1 className="text-[#F5EDD8] text-xl font-semibold">Invalid Payment Request</h1>
            <p className="text-[#9E9080] text-sm mt-2">Missing payment details. Please try checkout again.</p>
            <button
              onClick={() => router.replace("/checkout")}
              className="mt-5 px-4 py-2.5 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm"
            >
              Back to Checkout
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
