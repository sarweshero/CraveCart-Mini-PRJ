"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, AlertTriangle, Trash2, Mail, Phone, Clock, Globe } from "lucide-react";
import { useHotelAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { hotel, updateHotel, clearAuth } = useHotelAuthStore();
  const [form, setForm] = useState({
    restaurant_name: hotel?.restaurant_name ?? "",
    owner_name: hotel?.owner_name ?? "",
    email: hotel?.email ?? "",
    phone: "",
    timings: "06:00 AM - 10:00 PM",
    website: "",
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<"temporary" | "permanent" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    updateHotel({ restaurant_name: form.restaurant_name, owner_name: form.owner_name });
    toast.success("Settings saved successfully!");
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleteType === "permanent" && deleteConfirm !== hotel?.restaurant_name) {
      toast.error("Restaurant name doesn't match");
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
    toast.success(deleteType === "temporary" ? "Account deactivated temporarily" : "Account permanently deleted");
    clearAuth();
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-[#FAFAFA] font-display font-semibold text-3xl mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          Settings
        </h1>
        <p className="text-[#71717A] text-sm">Manage your restaurant profile and account preferences</p>
      </div>

      {/* Restaurant Profile */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 mb-5">
        <h2 className="text-[#FAFAFA] font-semibold mb-5">Restaurant Profile</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "restaurant_name", label: "Restaurant Name", icon: Globe, placeholder: "Murugan Idli Shop" },
              { key: "owner_name", label: "Owner Name", icon: Globe, placeholder: "Your full name" },
            ].map(({ key, label, icon: Icon, placeholder }) => (
              <div key={key}>
                <label className="block text-[#A1A1AA] text-xs font-medium mb-1.5">{label}</label>
                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-[#18181B] border border-[#27272A] focus-within:border-[#7C3AED]/50 transition-colors">
                  <Icon size={14} className="text-[#71717A]" />
                  <input
                    type="text"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-[#FAFAFA] text-sm placeholder-[#71717A] outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "email", label: "Email Address", icon: Mail, type: "email", placeholder: "admin@restaurant.com" },
              { key: "phone", label: "Phone Number", icon: Phone, type: "tel", placeholder: "+91 98765 43210" },
              { key: "timings", label: "Operating Hours", icon: Clock, type: "text", placeholder: "06:00 AM - 10:00 PM" },
              { key: "website", label: "Website (Optional)", icon: Globe, type: "url", placeholder: "https://yourrestaurant.com" },
            ].map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="block text-[#A1A1AA] text-xs font-medium mb-1.5">{label}</label>
                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-[#18181B] border border-[#27272A] focus-within:border-[#7C3AED]/50 transition-colors">
                  <Icon size={14} className="text-[#71717A]" />
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-[#FAFAFA] text-sm placeholder-[#71717A] outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
            saving ? "bg-[#27272A] text-[#71717A] cursor-not-allowed" : "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
          )}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <><Save size={14} />Save Changes</>}
        </button>
      </div>

      {/* Email Notifications */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 mb-5">
        <h2 className="text-[#FAFAFA] font-semibold mb-4">Email Notifications</h2>
        <div className="space-y-3">
          {[
            { label: "New order alerts", desc: "Get notified immediately when a new order is placed", enabled: true },
            { label: "AI response CC", desc: "Receive a CC copy of every AI response sent to customers", enabled: true },
            { label: "Weekly summary", desc: "Weekly digest of orders, revenue and reviews", enabled: false },
          ].map(({ label, desc, enabled }, i) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-[#27272A] last:border-0">
              <div>
                <p className="text-[#FAFAFA] text-sm font-medium">{label}</p>
                <p className="text-[#71717A] text-xs mt-0.5">{desc}</p>
              </div>
              <button className={cn(
                "w-11 h-6 rounded-full border-2 transition-all relative",
                enabled ? "bg-[#7C3AED] border-[#7C3AED]" : "bg-[#27272A] border-[#27272A]"
              )}>
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                  enabled ? "left-[22px]" : "left-0.5"
                )} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#111113] border border-[#F87171]/20 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-[#F87171]" />
          <h2 className="text-[#F87171] font-semibold">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 py-3 border-b border-[#27272A]">
            <div>
              <p className="text-[#FAFAFA] text-sm font-medium">Deactivate Account</p>
              <p className="text-[#71717A] text-xs mt-0.5">Temporarily disable your restaurant. You can reactivate anytime by logging in.</p>
            </div>
            <button
              onClick={() => { setDeleteType("temporary"); setShowDeleteModal(true); }}
              className="flex-shrink-0 px-4 py-2 rounded-xl border border-[#F87171]/30 text-[#F87171] text-sm hover:bg-[#F87171]/10 transition-all"
            >
              Deactivate
            </button>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-[#FAFAFA] text-sm font-medium">Delete Account Permanently</p>
              <p className="text-[#71717A] text-xs mt-0.5">Permanently delete your account and all data. This action cannot be undone.</p>
            </div>
            <button
              onClick={() => { setDeleteType("permanent"); setShowDeleteModal(true); }}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171] text-sm hover:bg-[#F87171]/20 transition-all"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && deleteType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#F87171]/10 border border-[#F87171]/20 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-[#F87171]" />
                </div>
                <h3 className="text-[#FAFAFA] font-semibold">
                  {deleteType === "temporary" ? "Deactivate Account?" : "Delete Account Permanently?"}
                </h3>
              </div>
              <p className="text-[#A1A1AA] text-sm leading-relaxed mb-4">
                {deleteType === "temporary"
                  ? "Your restaurant will be hidden from customers. You can reactivate by logging in again."
                  : "All your data — orders, reviews, AI templates — will be permanently deleted. This cannot be undone."}
              </p>
              {deleteType === "permanent" && (
                <div className="mb-4">
                  <label className="block text-[#A1A1AA] text-xs mb-1.5">
                    Type <strong className="text-[#F87171]">{hotel?.restaurant_name}</strong> to confirm
                  </label>
                  <input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={hotel?.restaurant_name}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm outline-none focus:border-[#F87171]/50"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#27272A] text-[#A1A1AA] text-sm hover:bg-[#18181B] transition-all">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-[#F87171] text-white text-sm font-semibold hover:bg-red-500 transition-all">
                  {deleteType === "temporary" ? "Deactivate" : "Delete Forever"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
