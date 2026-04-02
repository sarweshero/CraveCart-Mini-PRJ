"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, MapPin, Plus, Save, User as UserIcon, X } from "lucide-react";
import { authApi, mediaApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { Address } from "@/lib/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type AddressForm = Omit<Address, "id">;

const EMPTY_ADDRESS: AddressForm = {
  label: "Home",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  is_default: false,
};

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPendingFile, setAvatarPendingFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>((user?.addresses ?? []).map((addr) => ({ ...addr, id: String(addr.id) })));
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const refreshAddresses = async () => {
    const latest = await authApi.me();
    const normalized = latest.addresses.map((addr) => ({ ...addr, id: String(addr.id) }));
    setAddresses(normalized);
    updateUser({ addresses: normalized });
  };

  const sortedAddresses = useMemo(
    () => [...addresses].sort((a, b) => Number(b.is_default) - Number(a.is_default)),
    [addresses]
  );

  const validateProfile = () => {
    if (!name.trim()) return "Name is required";
    const normalized = phone.replace(/\s+/g, "");
    if (!/^[6-9]\d{9}$/.test(normalized)) return "Enter a valid 10-digit Indian mobile number";
    return null;
  };

  const validateAddress = () => {
    if (!addressForm.line1.trim()) return "Address line is required";
    if (!addressForm.city.trim()) return "City is required";
    if (!addressForm.state.trim()) return "State is required";
    if (!/^\d{6}$/.test(addressForm.pincode.trim())) return "Pincode must be 6 digits";
    return null;
  };

  const handleSaveProfile = async () => {
    const error = validateProfile();
    if (error) {
      toast.error(error);
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({ name: name.trim(), phone: phone.trim() });
      updateUser(updated);
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
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

  const clearAvatarDraft = () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl(null);
    setAvatarPendingFile(null);
  };

  const handleUploadAvatar = async () => {
    if (!avatarPendingFile) return;

    setUploadingAvatar(true);
    try {
      const upload = await mediaApi.uploadImage(avatarPendingFile, {
        folder: "uploads/avatars/customers",
        replaceUrl: user?.avatar || undefined,
      });
      const updated = await authApi.updateProfile({ avatar: upload.url });
      updateUser(updated);
      clearAvatarDraft();
      toast.success("Profile photo updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const resetAddressForm = () => {
    setAddressForm(EMPTY_ADDRESS);
    setEditingAddressId(null);
  };

  const handleSaveAddress = async () => {
    const error = validateAddress();
    if (error) {
      toast.error(error);
      return;
    }

    setSavingAddress(true);
    try {
      if (editingAddressId) {
        const updated = await authApi.updateAddress(editingAddressId, addressForm);
        setAddresses((prev) => prev.map((a) => (a.id === editingAddressId ? updated : a)));
      } else {
        const created = await authApi.addAddress(addressForm);
        setAddresses((prev) => [created, ...prev]);
      }
      await refreshAddresses();
      toast.success(editingAddressId ? "Address updated" : "Address added");
      resetAddressForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      is_default: address.is_default,
    });
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await authApi.deleteAddress(addressId);
      await refreshAddresses();
      toast.success("Address deleted");
      if (editingAddressId === addressId) resetAddressForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete address");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#9E9080] px-4 text-center">
        Unable to load profile details.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header>
          <h1 className="text-[#F5EDD8] font-display font-semibold text-2xl sm:text-3xl tracking-tight">My Profile</h1>
          <p className="text-[#9E9080] text-sm mt-1.5">Manage personal details and delivery addresses.</p>
        </header>

        <section className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserIcon size={16} className="text-[#E8A830]" />
            <h2 className="text-[#F5EDD8] font-semibold">Personal Information</h2>
          </div>

          <div className="mb-5 flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border border-[#2A2620] bg-[#1E1B16] flex items-center justify-center">
              {avatarPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreviewUrl} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={28} className="text-[#9E9080]" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2A2620] text-[#F5EDD8] text-sm cursor-pointer hover:border-[#E8A830]/40 transition-colors">
                  <Camera size={14} className="text-[#E8A830]" />
                  Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleAvatarSelected(e.target.files?.[0] ?? null);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2A2620] text-[#F5EDD8] text-sm cursor-pointer hover:border-[#E8A830]/40 transition-colors">
                  <Camera size={14} className="text-[#E8A830]" />
                  Use Camera
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      handleAvatarSelected(e.target.files?.[0] ?? null);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              {avatarPendingFile && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUploadAvatar}
                    disabled={uploadingAvatar}
                    className="px-3 py-1.5 rounded-lg bg-[#E8A830] text-[#0C0B09] text-xs font-semibold hover:bg-[#F5C842] transition-colors disabled:opacity-70"
                  >
                    {uploadingAvatar ? "Uploading..." : "Upload Selected Photo"}
                  </button>
                  <button
                    onClick={clearAvatarDraft}
                    disabled={uploadingAvatar}
                    className="px-3 py-1.5 rounded-lg border border-[#2A2620] text-[#BFB49A] text-xs hover:text-[#F5EDD8] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <p className="text-[#9E9080] text-xs">JPG, PNG, WEBP up to 10MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" value={name} onChange={setName} placeholder="Enter your name" />
            <Input label="Phone" value={phone} onChange={setPhone} placeholder="10-digit mobile number" />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
                savingProfile
                  ? "bg-[#2A2620] text-[#9E9080] cursor-not-allowed"
                  : "bg-[#E8A830] text-[#0C0B09] hover:bg-[#F5C842]"
              )}
            >
              <Save size={14} />
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </section>

        <section className="bg-[#161410] border border-[#2A2620] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-[#E8A830]" />
            <h2 className="text-[#F5EDD8] font-semibold">Delivery Addresses</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              {sortedAddresses.length === 0 ? (
                <p className="text-[#9E9080] text-sm">No addresses added yet.</p>
              ) : (
                sortedAddresses.map((addr) => (
                  <div key={addr.id} className="border border-[#2A2620] rounded-xl p-3.5 bg-[#1E1B16]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[#F5EDD8] text-sm font-semibold">{addr.label}</span>
                        {addr.is_default && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8A830]/15 text-[#E8A830] font-semibold">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditAddress(addr)}
                          className="text-xs text-[#BFB49A] hover:text-[#F5EDD8] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-xs text-[#F87171] hover:text-[#EF4444] transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-[#9E9080] text-xs mt-1.5 leading-relaxed">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ""}
                      <br />
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border border-[#2A2620] rounded-xl p-4 bg-[#1E1B16] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[#F5EDD8] text-sm font-semibold">
                  {editingAddressId ? "Edit Address" : "Add New Address"}
                </h3>
                {editingAddressId && (
                  <button onClick={resetAddressForm} className="text-[#9E9080] hover:text-[#F5EDD8]">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["Home", "Work", "Other"] as const).map((label) => (
                  <button
                    key={label}
                    onClick={() => setAddressForm((prev) => ({ ...prev, label }))}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                      addressForm.label === label
                        ? "border-[#E8A830]/50 bg-[#E8A830]/10 text-[#E8A830]"
                        : "border-[#2A2620] text-[#9E9080]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Input label="Address line" value={addressForm.line1} onChange={(v) => setAddressForm((prev) => ({ ...prev, line1: v }))} placeholder="Flat / Street / Landmark" />
              <Input label="Line 2 (optional)" value={addressForm.line2 ?? ""} onChange={(v) => setAddressForm((prev) => ({ ...prev, line2: v }))} placeholder="Area" />
              <div className="grid grid-cols-2 gap-2">
                <Input label="City" value={addressForm.city} onChange={(v) => setAddressForm((prev) => ({ ...prev, city: v }))} placeholder="City" />
                <Input label="State" value={addressForm.state} onChange={(v) => setAddressForm((prev) => ({ ...prev, state: v }))} placeholder="State" />
              </div>
              <Input label="Pincode" value={addressForm.pincode} onChange={(v) => setAddressForm((prev) => ({ ...prev, pincode: v }))} placeholder="6-digit pincode" />

              <label className="flex items-center gap-2 text-[#BFB49A] text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                  className="accent-[#E8A830]"
                />
                Set as default address
              </label>

              <button
                onClick={handleSaveAddress}
                disabled={savingAddress}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
                  savingAddress
                    ? "bg-[#2A2620] text-[#9E9080] cursor-not-allowed"
                    : "bg-[#E8A830] text-[#0C0B09] hover:bg-[#F5C842]"
                )}
              >
                <Plus size={14} />
                {savingAddress ? "Saving..." : editingAddressId ? "Update Address" : "Add Address"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="block text-[#9E9080] text-xs font-medium mb-1.5">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1E1B16] border border-[#2A2620] rounded-xl px-3.5 py-2.5 text-[#F5EDD8] text-sm placeholder-[#9E9080] outline-none focus:border-[#E8A830]/50 focus:shadow-[0_0_0_3px_rgba(232,168,48,0.08)] transition-all"
      />
    </label>
  );
}
