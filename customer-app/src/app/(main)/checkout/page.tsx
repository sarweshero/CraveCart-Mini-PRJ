"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, CreditCard, Wallet, Banknote, Tag, ChevronRight, Plus, Check, ArrowLeft, Loader2, Building2, AlertTriangle, X } from "lucide-react";
import { useCartStore, useAuthStore } from "@/lib/store";
import { authApi, orderApi, cartApi, restaurantApi } from "@/lib/api";
import { calculateTax, cn, formatCurrency, roundMoney } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import type { Address } from "@/lib/types";

type ShopCheckModalState = {
  closedItems: Array<{ id: string; name: string; quantity: number; restaurantName: string }>;
  openItems: Array<{ id: string; name: string; quantity: number; restaurantName: string }>;
} | null;

type AddressForm = Omit<Address, "id">;

const EMPTY_ADDRESS_FORM: AddressForm = {
  label: "Home",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  is_default: false,
};

const PAYMENT_METHODS = [
  { id: "upi",        label: "UPI",                icon: Wallet,    description: "Google Pay, PhonePe, Paytm, BHIM" },
  { id: "card",       label: "Credit / Debit Card", icon: CreditCard, description: "Visa, Mastercard, RuPay" },
  { id: "netbanking", label: "Net Banking",          icon: Building2, description: "All major Indian banks" },
  { id: "cod",        label: "Cash on Delivery",     icon: Banknote,  description: "Pay when order arrives" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const { items, restaurantName, getSubtotal, getDeliveryFee, getTotal, applyCoupon, removeCoupon, appliedCoupon, clearCart } = useCartStore();

  const [selectedAddress, setSelectedAddress] = useState<string>(() => {
    const defaultAddress = user?.addresses.find((a) => a.is_default);
    return defaultAddress ? String(defaultAddress.id) : "";
  });
  const [paymentMethod, setPaymentMethod]     = useState("upi");
  const [couponInput, setCouponInput]         = useState("");
  const [couponLoading, setCouponLoading]     = useState(false);
  const [instructions, setInstructions]       = useState("");
  const [placing, setPlacing]                 = useState(false);
  const [shopCheckModal, setShopCheckModal]   = useState<ShopCheckModalState>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS_FORM);

  const subtotal   = getSubtotal();
  const delivery   = getDeliveryFee();
  const taxes      = calculateTax(subtotal);
  const platformFee = 5;
  const discount   = appliedCoupon?.discount ?? 0;
  const total      = getTotal();

  const filterToOpenShopItems = async (): Promise<boolean> => {
    const uniqueRestaurantIds = Array.from(new Set(items.map((i) => i.restaurantId).filter(Boolean)));
    if (uniqueRestaurantIds.length === 0) return true;

    const statusByRestaurant = new Map<string, boolean>();

    await Promise.all(
      uniqueRestaurantIds.map(async (rid) => {
        try {
          const data = await restaurantApi.get(String(rid));
          statusByRestaurant.set(String(rid), Boolean(data.is_open));
        } catch {
          // If fetch fails, treat as closed to avoid failed checkout.
          statusByRestaurant.set(String(rid), false);
        }
      })
    );

    const open = items.filter((i) => statusByRestaurant.get(String(i.restaurantId)) === true);
    const closed = items.filter((i) => statusByRestaurant.get(String(i.restaurantId)) !== true);

    if (closed.length === 0) {
      return true;
    }

    setShopCheckModal({
      openItems: open.map((i) => ({
        id: i.id,
        name: i.menu_item.name,
        quantity: i.quantity,
        restaurantName: i.restaurantName,
      })),
      closedItems: closed.map((i) => ({
        id: i.id,
        name: i.menu_item.name,
        quantity: i.quantity,
        restaurantName: i.restaurantName,
      })),
    });
    return false;
  };

  const keepOpenShopItemsAndContinue = () => {
    if (!shopCheckModal) return;

    const keepIds = new Set(shopCheckModal.openItems.map((i) => i.id));
    const retained = items.filter((i) => keepIds.has(i.id));

    if (retained.length === 0) {
      useCartStore.setState({ items: [], restaurantId: null, restaurantName: null, appliedCoupon: null, conflictPending: null });
      setShopCheckModal(null);
      toast.error("All selected shops are closed. Please choose items from open shops.");
      router.push("/restaurants");
      return;
    }

    const groupedByRestaurant = retained.reduce<Record<string, typeof retained>>((acc, item) => {
      const key = String(item.restaurantId);
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {});

    // Current backend checkout supports one restaurant per order.
    const bestRestaurantItems = Object.values(groupedByRestaurant)
      .sort((a, b) => b.length - a.length)[0] ?? [];

    const nextRestaurantId = bestRestaurantItems[0]?.restaurantId ?? null;
    const nextRestaurantName = bestRestaurantItems[0]?.restaurantName ?? null;

    useCartStore.setState({
      items: bestRestaurantItems,
      restaurantId: nextRestaurantId,
      restaurantName: nextRestaurantName,
      appliedCoupon: null,
      conflictPending: null,
    });
    setShopCheckModal(null);

    if (retained.length !== bestRestaurantItems.length) {
      toast("We kept items from one open shop for checkout.");
    } else {
      toast.success("Closed-shop items removed. You can continue checkout.");
    }
  };

  const syncBackendCartSnapshot = async () => {
    await cartApi.clear();

    for (const item of items) {
      await cartApi.addItem(String(item.menu_item.id), item.quantity, item.customizations);
    }

    if (appliedCoupon?.code) {
      await cartApi.applyCoupon(appliedCoupon.code);
    }
  };

  const handleCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const res = await cartApi.applyCoupon(couponInput.toUpperCase());
      applyCoupon(couponInput.toUpperCase(), res.discount);
      toast.success(`Coupon applied! You save ${formatCurrency(res.discount)}`);
      setCouponInput("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired coupon code");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    removeCoupon(); // local store
    try { await cartApi.removeCoupon(); } catch { /* non-critical */ }
  };

  const validateAddress = () => {
    if (!addressForm.line1.trim()) return "Address line is required";
    if (!addressForm.city.trim()) return "City is required";
    if (!addressForm.state.trim()) return "State is required";
    if (!/^\d{6}$/.test(addressForm.pincode.trim())) return "Pincode must be 6 digits";
    return null;
  };

  const handleCreateAddress = async () => {
    const error = validateAddress();
    if (error) {
      toast.error(error);
      return;
    }

    setSavingAddress(true);
    try {
      const created = await authApi.addAddress({
        ...addressForm,
        line1: addressForm.line1.trim(),
        line2: addressForm.line2?.trim() ?? "",
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim(),
      });

      const latest = await authApi.me();
      const normalizedAddresses = latest.addresses.map((addr) => ({ ...addr, id: String(addr.id) }));
      updateUser({ addresses: normalizedAddresses });

      setSelectedAddress(String(created.id));
      setAddressForm(EMPTY_ADDRESS_FORM);
      setShowAddressModal(false);
      toast.success("Address added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error("Please select a delivery address"); return; }
    if (!paymentMethod)   { toast.error("Please select a payment method"); return; }
    if (items.length === 0) { toast.error("Your cart is empty"); return; }

    const canProceed = await filterToOpenShopItems();
    if (!canProceed) return;

    setPlacing(true);
    try {
      // Rebuild backend cart from the client snapshot to avoid stale server-side totals.
      await syncBackendCartSnapshot();

      const res = await orderApi.place({
        delivery_address_id: selectedAddress,
        payment_method: paymentMethod,
        instructions: instructions || undefined,
      });

      if (paymentMethod === "cod") {
        clearCart();
        cartApi.clear().catch(() => {}); // sync backend cart clear
        toast.success("Order placed! Pay on delivery. 🎉");
        router.push(`/orders/${res.id}`);
      } else {
        const params = new URLSearchParams({
          order_id: res.id,
          amount: String(res.total),
          method: paymentMethod,
        });
        router.push(`/checkout/payment?${params.toString()}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[#F5EDD8] font-semibold text-lg">Your cart is empty</p>
        <Link href="/restaurants" className="px-5 py-2.5 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold text-sm hover:bg-[#F5C842] transition-colors">
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen">
      <div className="page-shell py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/restaurants" className="w-9 h-9 rounded-xl bg-[#161410] border border-[#2A2620] flex items-center justify-center text-[#BFB49A] hover:text-[#F5EDD8] hover:border-[#E8A830]/30 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-[#F5EDD8] font-display font-semibold text-2xl tracking-tight">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-5">
            {/* Delivery Address */}
            <Section title="Delivery Address" icon={MapPin}>
              <div className="space-y-3">
                {user?.addresses.map((addr) => (
                  <AddressOption
                    key={String(addr.id)}
                    address={{ ...addr, id: String(addr.id) }}
                    selected={selectedAddress === String(addr.id)}
                    onSelect={() => setSelectedAddress(String(addr.id))}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#2A2620] text-[#9E9080] hover:border-[#E8A830]/40 hover:text-[#E8A830] transition-all text-sm"
                >
                  <Plus size={14} /> Add New Address
                </button>
              </div>
            </Section>

            {/* Payment Method */}
            <Section title="Payment Method" icon={CreditCard}>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                      className={cn("w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                        paymentMethod === pm.id ? "border-[#E8A830]/50 bg-[#E8A830]/5" : "border-[#2A2620] bg-[#1E1B16] hover:border-[#E8A830]/25")}>
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", paymentMethod === pm.id ? "bg-[#E8A830]/20" : "bg-[#2A2620]")}>
                        <Icon size={16} className={paymentMethod === pm.id ? "text-[#E8A830]" : "text-[#9E9080]"} />
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-sm font-medium", paymentMethod === pm.id ? "text-[#F5EDD8]" : "text-[#BFB49A]")}>{pm.label}</p>
                        <p className="text-[#9E9080] text-xs">{pm.description}</p>
                      </div>
                      {paymentMethod === pm.id && (
                        <div className="w-5 h-5 rounded-full bg-[#E8A830] flex items-center justify-center flex-shrink-0">
                          <Check size={11} className="text-[#0C0B09]" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Instructions */}
            <Section title="Delivery Instructions" icon={ChevronRight}>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="E.g. Ring the doorbell twice, leave at door..." rows={3}
                className="w-full bg-[#1E1B16] border border-[#2A2620] rounded-xl px-4 py-3 text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/50 transition-colors resize-none" />
            </Section>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5 sticky top-24">
              <h2 className="text-[#F5EDD8] font-semibold mb-4">Order Summary</h2>
              <div className="text-[#9E9080] text-xs mb-3 font-medium">{restaurantName}</div>
              <div className="space-y-2 mb-4 pb-4 border-b border-[#2A2620]">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-[#BFB49A]">{item.quantity}× {item.menu_item.name}</span>
                    <span className="text-[#BFB49A]">{formatCurrency(item.item_total)}</span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              {!appliedCoupon ? (
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1E1B16] border border-[#2A2620] focus-within:border-[#E8A830]/50 transition-colors">
                    <Tag size={13} className="text-[#9E9080]" />
                    <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleCoupon()}
                      placeholder="Coupon code" className="flex-1 bg-transparent text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none" />
                  </div>
                  <button onClick={handleCoupon} disabled={couponLoading || !couponInput.trim()}
                    className="px-4 py-2 rounded-xl bg-[#E8A830]/10 border border-[#E8A830]/30 text-[#E8A830] text-sm font-semibold hover:bg-[#E8A830]/20 transition-all disabled:opacity-50">
                    {couponLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#4ADE80]/10 border border-[#4ADE80]/20 mb-4">
                  <div className="flex items-center gap-2">
                    <Tag size={12} className="text-[#4ADE80]" />
                    <span className="text-[#4ADE80] text-xs font-semibold">{appliedCoupon.code}</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-[#9E9080] hover:text-[#F87171] transition-colors text-xs">Remove</button>
                </div>
              )}

              {/* Bill */}
              <div className="space-y-2 text-sm">
                {[{ label: "Subtotal", value: subtotal }, { label: "Delivery", value: delivery }, { label: "Platform fee", value: platformFee }, { label: "Taxes (5%)", value: taxes }].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[#9E9080]">
                    <span>{label}</span><span>{formatCurrency(value)}</span>
                  </div>
                ))}
                {discount > 0 && (
                  <div className="flex justify-between text-[#4ADE80]">
                    <span>Discount</span><span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[#2A2620] flex justify-between font-semibold text-[#F5EDD8]">
                  <span>Total</span><span className="text-[#E8A830] text-lg">{formatCurrency(total)}</span>
                </div>
              </div>

              <button onClick={handlePlaceOrder} disabled={placing}
                className={cn("w-full flex items-center justify-center gap-2 mt-5 py-4 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]",
                  placing ? "bg-[#2A2620] text-[#9E9080] cursor-not-allowed" : "bg-[#E8A830] text-[#0C0B09] hover:bg-[#F5C842] shadow-[0_0_25px_rgba(232,168,48,0.25)] hover:shadow-[0_0_35px_rgba(232,168,48,0.35)]")}>
                {placing ? (<><Loader2 size={16} className="animate-spin" /> Placing Order...</>) : (<>Place Order · {formatCurrency(roundMoney(total))}<ChevronRight size={16} /></>)}
              </button>
              <p className="text-[#9E9080] text-[11px] text-center mt-3">By placing order you agree to our Terms & Conditions</p>
            </div>
          </div>
        </div>
      </div>

      </div>

      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-[#F5EDD8] font-semibold">Add Delivery Address</h3>
                <p className="text-[#9E9080] text-sm mt-1">Save an address and continue checkout.</p>
              </div>
              <button onClick={() => setShowAddressModal(false)} className="text-[#9E9080] hover:text-[#F5EDD8]">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(["Home", "Work", "Other"] as const).map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAddressForm((prev) => ({ ...prev, label }))}
                    className={cn(
                      "px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                      addressForm.label === label
                        ? "border-[#E8A830]/50 bg-[#E8A830]/10 text-[#E8A830]"
                        : "border-[#2A2620] text-[#BFB49A] hover:border-[#E8A830]/25"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={addressForm.line1}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, line1: e.target.value }))}
                placeholder="Flat / Street / Landmark"
                className="w-full px-4 py-3 rounded-xl border border-[#2A2620] bg-[#1E1B16] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/40"
              />

              <input
                type="text"
                value={addressForm.line2 ?? ""}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, line2: e.target.value }))}
                placeholder="Area (optional)"
                className="w-full px-4 py-3 rounded-xl border border-[#2A2620] bg-[#1E1B16] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/40"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="w-full px-4 py-3 rounded-xl border border-[#2A2620] bg-[#1E1B16] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/40"
                />
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                  className="w-full px-4 py-3 rounded-xl border border-[#2A2620] bg-[#1E1B16] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/40"
                />
                <input
                  type="text"
                  value={addressForm.pincode}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, pincode: e.target.value }))}
                  placeholder="Pincode"
                  className="w-full px-4 py-3 rounded-xl border border-[#2A2620] bg-[#1E1B16] text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/40"
                />
              </div>

              <label className="flex items-center gap-2 text-[#BFB49A] text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                  className="accent-[#E8A830]"
                />
                Set as default address
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#2A2620] text-[#9E9080] hover:text-[#F5EDD8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAddress}
                disabled={savingAddress}
                className={cn(
                  "px-4 py-2.5 rounded-xl font-semibold transition-all",
                  savingAddress
                    ? "bg-[#2A2620] text-[#9E9080] cursor-not-allowed"
                    : "bg-[#E8A830] text-[#0C0B09] hover:bg-[#F5C842]"
                )}
              >
                {savingAddress ? "Saving..." : "Save Address"}
              </button>
            </div>
          </div>
        </div>
      )}

      {shopCheckModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-xl bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FBBF24]/15 flex items-center justify-center mt-0.5">
                  <AlertTriangle size={16} className="text-[#FBBF24]" />
                </div>
                <div>
                  <h3 className="text-[#F5EDD8] font-semibold">Some shops are closed right now</h3>
                  <p className="text-[#9E9080] text-sm mt-1">You can continue with items from open shops.</p>
                </div>
              </div>
              <button onClick={() => setShopCheckModal(null)} className="text-[#9E9080] hover:text-[#F5EDD8]">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              <div>
                <p className="text-[#FCA5A5] text-xs uppercase tracking-wider mb-2">Closed shop items</p>
                <div className="space-y-2">
                  {shopCheckModal.closedItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm rounded-lg border border-[#F87171]/25 bg-[#F87171]/8 px-3 py-2">
                      <span className="text-[#F5CDD2]">{item.quantity}× {item.name}</span>
                      <span className="text-[#FCA5A5] text-xs">{item.restaurantName}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[#4ADE80] text-xs uppercase tracking-wider mb-2">Open shop items</p>
                <div className="space-y-2">
                  {shopCheckModal.openItems.length === 0 ? (
                    <div className="text-[#9E9080] text-sm rounded-lg border border-[#2A2620] px-3 py-2">No selected items are from open shops.</div>
                  ) : (
                    shopCheckModal.openItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm rounded-lg border border-[#4ADE80]/20 bg-[#4ADE80]/8 px-3 py-2">
                        <span className="text-[#C8F4D8]">{item.quantity}× {item.name}</span>
                        <span className="text-[#86EFAC] text-xs">{item.restaurantName}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShopCheckModal(null)}
                className="px-4 py-2.5 rounded-xl border border-[#2A2620] text-[#9E9080] hover:text-[#F5EDD8]"
              >
                Review Cart
              </button>
              <button
                onClick={keepOpenShopItemsAndContinue}
                className="px-4 py-2.5 rounded-xl bg-[#E8A830] text-[#0C0B09] font-semibold hover:bg-[#F5C842]"
              >
                Continue with Open Shops
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#E8A830]/15 flex items-center justify-center"><Icon size={14} className="text-[#E8A830]" /></div>
        <h2 className="text-[#F5EDD8] font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function AddressOption({ address, selected, onSelect }: { address: Address; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={cn("w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left", selected ? "border-[#E8A830]/50 bg-[#E8A830]/5" : "border-[#2A2620] bg-[#1E1B16] hover:border-[#E8A830]/25")}>
      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all", selected ? "border-[#E8A830] bg-[#E8A830]" : "border-[#2A2620]")}>
        {selected && <div className="w-2 h-2 rounded-full bg-[#0C0B09]" />}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium", selected ? "text-[#F5EDD8]" : "text-[#BFB49A]")}>{address.label}</p>
          {address.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8A830]/15 text-[#E8A830] font-semibold">DEFAULT</span>}
        </div>
        <p className="text-[#9E9080] text-xs mt-0.5 leading-relaxed">{address.line1}{address.line2 && `, ${address.line2}`}<br />{address.city}, {address.pincode}</p>
      </div>
    </button>
  );
}
