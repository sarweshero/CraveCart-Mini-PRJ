"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, AlertTriangle, Trash2, Mail, Phone, Clock, Globe, Camera, User, Image as ImageIcon } from "lucide-react";
import { useHotelAuthStore } from "@/lib/store";
import { dashboardApi, hotelAuthApi, mediaApi } from "@/lib/api";
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [avatarPendingFile, setAvatarPendingFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [thumbnailPendingFile, setThumbnailPendingFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [coverPendingFile, setCoverPendingFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<"temporary" | "permanent" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      restaurant_name: hotel?.restaurant_name ?? "",
      owner_name: hotel?.owner_name ?? "",
      email: hotel?.email ?? "",
      phone: hotel?.phone ?? prev.phone,
      timings: hotel?.timings ?? prev.timings,
    }));
  }, [hotel?.restaurant_name, hotel?.owner_name, hotel?.email, hotel?.phone, hotel?.timings]);

  useEffect(() => {
    let active = true;

    const loadHotelProfile = async () => {
      try {
        const profile = await dashboardApi.profile();
        if (!active) return;

        setForm((prev) => ({
          ...prev,
          restaurant_name: profile.restaurant_name ?? prev.restaurant_name,
          owner_name: profile.owner_name ?? prev.owner_name,
          email: profile.owner_email ?? prev.email,
          phone: profile.phone ?? profile.owner_phone ?? prev.phone,
          timings: profile.timings ?? prev.timings,
        }));

        updateHotel({
          restaurant_name: profile.restaurant_name,
          owner_name: profile.owner_name,
          email: profile.owner_email ?? hotel?.email,
          phone: profile.phone ?? profile.owner_phone,
          timings: profile.timings,
          thumbnail: profile.thumbnail,
          cover_image: profile.cover_image,
          is_open: profile.is_open,
        });
      } catch {
        // Keep existing local state if profile request fails.
      }
    };

    loadHotelProfile();
    return () => {
      active = false;
    };
  }, [updateHotel, hotel?.email]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
      }
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [avatarPreviewUrl, thumbnailPreviewUrl, coverPreviewUrl]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const profile = await dashboardApi.updateProfile({
        restaurant_name: form.restaurant_name,
        owner_name: form.owner_name,
        owner_phone: form.phone,
        phone: form.phone,
        timings: form.timings,
      });

      updateHotel({
        restaurant_name: profile.restaurant_name ?? form.restaurant_name,
        owner_name: profile.owner_name ?? form.owner_name,
        email: profile.owner_email ?? hotel?.email,
        phone: profile.phone ?? profile.owner_phone ?? form.phone,
        timings: profile.timings ?? form.timings,
      });

      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelected = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPendingFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleThumbnailSelected = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
    }
    setThumbnailPendingFile(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
  };

  const handleCoverSelected = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverPendingFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const clearAvatarDraft = () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl(null);
    setAvatarPendingFile(null);
  };

  const clearThumbnailDraft = () => {
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
    }
    setThumbnailPreviewUrl(null);
    setThumbnailPendingFile(null);
  };

  const clearCoverDraft = () => {
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverPreviewUrl(null);
    setCoverPendingFile(null);
  };

  const handleAvatarUpload = async () => {
    if (!avatarPendingFile) return;

    setUploadingAvatar(true);
    try {
      const upload = await mediaApi.uploadImage(avatarPendingFile, {
        folder: "uploads/avatars/hotels",
        replaceUrl: hotel?.avatar || undefined,
      });
      await hotelAuthApi.updateProfile({ avatar: upload.url });
      updateHotel({ avatar: upload.url });
      clearAvatarDraft();
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleThumbnailUpload = async () => {
    if (!thumbnailPendingFile) return;

    setUploadingThumbnail(true);
    try {
      const upload = await mediaApi.uploadImage(thumbnailPendingFile, {
        folder: "uploads/restaurants/thumbnail",
        replaceUrl: hotel?.thumbnail || undefined,
      });
      const profile = await dashboardApi.updateProfile({ thumbnail: upload.url });
      updateHotel({ thumbnail: profile.thumbnail ?? upload.url });
      clearThumbnailDraft();
      toast.success("Card thumbnail updated");
    } catch {
      toast.error("Failed to upload card thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleCoverUpload = async () => {
    if (!coverPendingFile) return;

    setUploadingCover(true);
    try {
      const upload = await mediaApi.uploadImage(coverPendingFile, {
        folder: "uploads/restaurants/cover",
        replaceUrl: hotel?.cover_image || undefined,
      });
      const profile = await dashboardApi.updateProfile({ cover_image: upload.url });
      updateHotel({ cover_image: profile.cover_image ?? upload.url });
      clearCoverDraft();
      toast.success("Cover photo updated");
    } catch {
      toast.error("Failed to upload cover photo");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDelete = async () => {
    if (deleteType === "permanent" && deleteConfirm !== hotel?.restaurant_name) {
      toast.error("Restaurant name doesn't match");
      return;
    }
    try {
      await hotelAuthApi.logout();
    } finally {
      clearAuth();
      toast.success(deleteType === "temporary" ? "Account deactivated" : "Account permanently deleted");
    }
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
        <div className="mb-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-[#27272A] bg-[#18181B] flex items-center justify-center">
            {avatarPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreviewUrl} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : hotel?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hotel.avatar} alt="Hotel avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={22} className="text-[#71717A]" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#27272A] text-[#A1A1AA] text-sm cursor-pointer hover:text-[#FAFAFA] transition-colors">
                <Camera size={14} className="text-[#7C3AED]" />
                Choose image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={(e) => {
                    handleAvatarSelected(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#27272A] text-[#A1A1AA] text-sm cursor-pointer hover:text-[#FAFAFA] transition-colors">
                <Camera size={14} className="text-[#7C3AED]" />
                Use camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={(e) => {
                    handleAvatarSelected(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {avatarPendingFile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-medium hover:bg-[#6D28D9] disabled:opacity-70"
                >
                  {uploadingAvatar ? "Uploading..." : "Upload selected"}
                </button>
                <button
                  onClick={clearAvatarDraft}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] text-xs hover:text-[#FAFAFA]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#27272A] bg-[#18181B] p-3.5">
            <p className="text-[#FAFAFA] text-sm font-medium mb-2">Card Thumbnail</p>
            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#27272A] bg-[#111113]">
              {thumbnailPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
              ) : hotel?.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hotel.thumbnail} alt="Restaurant thumbnail" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[radial-gradient(circle_at_25%_20%,#FB7185_0%,transparent_45%),radial-gradient(circle_at_85%_80%,#22D3EE_0%,transparent_48%),linear-gradient(135deg,#1F2937_0%,#111827_100%)] flex items-center justify-center">
                  <ImageIcon size={22} className="text-[#D4D4D8]" />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] text-xs cursor-pointer hover:text-[#FAFAFA] transition-colors">
                <Camera size={12} className="text-[#7C3AED]" />
                Choose
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingThumbnail}
                  onChange={(e) => {
                    handleThumbnailSelected(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {thumbnailPendingFile && (
                <>
                  <button
                    onClick={handleThumbnailUpload}
                    disabled={uploadingThumbnail}
                    className="px-2.5 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-medium disabled:opacity-70"
                  >
                    {uploadingThumbnail ? "Uploading..." : "Upload"}
                  </button>
                  <button
                    onClick={clearThumbnailDraft}
                    disabled={uploadingThumbnail}
                    className="px-2.5 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] text-xs hover:text-[#FAFAFA]"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#27272A] bg-[#18181B] p-3.5">
            <p className="text-[#FAFAFA] text-sm font-medium mb-2">Cover Photo</p>
            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#27272A] bg-[#111113]">
              {coverPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreviewUrl} alt="Cover preview" className="w-full h-full object-cover" />
              ) : hotel?.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hotel.cover_image} alt="Restaurant cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[radial-gradient(circle_at_15%_25%,#F59E0B_0%,transparent_45%),radial-gradient(circle_at_80%_70%,#A78BFA_0%,transparent_45%),linear-gradient(120deg,#111827_0%,#172554_100%)] flex items-center justify-center">
                  <ImageIcon size={22} className="text-[#D4D4D8]" />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] text-xs cursor-pointer hover:text-[#FAFAFA] transition-colors">
                <Camera size={12} className="text-[#7C3AED]" />
                Choose
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingCover}
                  onChange={(e) => {
                    handleCoverSelected(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {coverPendingFile && (
                <>
                  <button
                    onClick={handleCoverUpload}
                    disabled={uploadingCover}
                    className="px-2.5 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-medium disabled:opacity-70"
                  >
                    {uploadingCover ? "Uploading..." : "Upload"}
                  </button>
                  <button
                    onClick={clearCoverDraft}
                    disabled={uploadingCover}
                    className="px-2.5 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] text-xs hover:text-[#FAFAFA]"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

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
