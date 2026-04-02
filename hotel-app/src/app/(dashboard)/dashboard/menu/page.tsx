"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Camera,
  Plus,
  ToggleLeft,
  ToggleRight,
  UtensilsCrossed,
  Flame,
  Leaf,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { mediaApi, menuApi } from "@/lib/api";
import toast from "react-hot-toast";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  is_available: boolean;
  is_veg?: boolean;
  is_bestseller?: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  items: MenuItem[];
}

interface ItemFormState {
  category: string;
  name: string;
  description: string;
  price: string;
  image: string;
  is_veg: boolean;
  is_bestseller: boolean;
  is_available: boolean;
}

const EMPTY_FORM: ItemFormState = {
  category: "",
  name: "",
  description: "",
  price: "",
  image: "",
  is_veg: true,
  is_bestseller: false,
  is_available: true,
};

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const data = await menuApi.list();
      const cats = (data as { categories: MenuCategory[] }).categories ?? [];
      setCategories(cats);
      if (cats.length > 0) {
        setActiveCategory((prev) => prev || cats[0].id);
      }
    } catch {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);
  const availableItems = categories.reduce((acc, c) => acc + c.items.filter((i) => i.is_available).length, 0);
  const activecat = categories.find((c) => c.id === activeCategory);

  const formTitle = useMemo(() => (editingItemId ? "Edit Menu Item" : "Add Menu Item"), [editingItemId]);

  const resetForm = (categoryId?: string) => {
    setEditingItemId(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setPendingImageFile(null);
    const categoryName = categories.find((c) => c.id === (categoryId ?? activeCategory))?.name ?? "";
    setForm({ ...EMPTY_FORM, category: categoryName });
  };

  const openCreateForm = () => {
    resetForm(activeCategory);
    setFormOpen(true);
  };

  const openEditForm = (item: MenuItem) => {
    const categoryName = categories.find((cat) => cat.id === activeCategory)?.name ?? "";
    setEditingItemId(item.id);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setPendingImageFile(null);
    setForm({
      category: categoryName,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      image: item.image ?? "",
      is_veg: item.is_veg !== false,
      is_bestseller: Boolean(item.is_bestseller),
      is_available: item.is_available,
    });
    setFormOpen(true);
  };

  const handleToggle = async (itemId: string, currentAvailable: boolean) => {
    setTogglingId(itemId);
    try {
      await menuApi.toggleAvailability(itemId);
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, is_available: !item.is_available } : item
          ),
        }))
      );
      toast.success(`Item marked as ${currentAvailable ? "unavailable" : "available"}`);
    } catch {
      toast.error("Failed to update item availability");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await menuApi.deleteItem(itemId);
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.filter((item) => item.id !== itemId),
        }))
      );
      toast.success("Menu item deleted");
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handleSaveItem = async () => {
    if (!form.category.trim() || !form.name.trim() || !form.price.trim()) {
      toast.error("Category, item name and price are required");
      return;
    }

    const parsedPrice = Number(form.price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    setFormSaving(true);
    try {
      if (editingItemId) {
        await menuApi.updateItem(editingItemId, {
          name: form.name.trim(),
          description: form.description.trim(),
          price: parsedPrice,
          image: form.image.trim(),
          is_veg: form.is_veg,
          is_bestseller: form.is_bestseller,
          is_available: form.is_available,
        });
        toast.success("Menu item updated");
      } else {
        const categoryInput = form.category.trim();
        const matchedCategory = categories.find(
          (c) => c.name.trim().toLowerCase() === categoryInput.toLowerCase()
        );

        await menuApi.createItem({
          category_id: matchedCategory?.id,
          category_name: matchedCategory ? undefined : categoryInput,
          name: form.name.trim(),
          description: form.description.trim(),
          price: parsedPrice,
          image: form.image.trim(),
          is_veg: form.is_veg,
          is_bestseller: form.is_bestseller,
          is_available: form.is_available,
        });
        toast.success("Menu item created");
      }

      setFormOpen(false);
      resetForm(activeCategory);
      await loadMenu();
    } catch {
      toast.error("Failed to save menu item");
    } finally {
      setFormSaving(false);
    }
  };

  const handleImageSelected = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setPendingImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setPendingImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleImageUpload = async () => {
    if (!pendingImageFile) return;

    setImageUploading(true);
    try {
      const uploaded = await mediaApi.uploadImage(pendingImageFile, {
        folder: "uploads/menu-items",
        replaceUrl: form.image || undefined,
      });
      setForm((prev) => ({ ...prev, image: uploaded.url }));
      clearSelectedImage();
      toast.success("Image uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED] mx-auto mb-2" />
          <p className="text-[#71717A] text-sm">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[#FAFAFA] font-semibold text-3xl mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            Menu Management
          </h1>
          <p className="text-[#71717A] text-sm">{availableItems}/{totalItems} items available</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMenu}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] text-sm transition-colors"
            title="Refresh menu"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-all shadow-[0_0_20px_rgba(124,58,237,0.25)]"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Items", value: totalItems, color: "#FAFAFA" },
          { label: "Available Now", value: availableItems, color: "#4ADE80" },
          { label: "Unavailable", value: totalItems - availableItems, color: "#F87171" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111113] border border-[#27272A] rounded-2xl px-5 py-4">
            <p className="text-[#71717A] text-xs mb-1">{label}</p>
            <p className="font-bold text-2xl" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-16 bg-[#111113] border border-[#27272A] rounded-2xl">
          <UtensilsCrossed className="w-12 h-12 text-[#3F3F46] mx-auto mb-3" />
          <p className="text-[#FAFAFA] font-semibold">No menu items yet</p>
          <p className="text-[#71717A] text-sm mt-1">Add your first menu category and items to get started.</p>
        </div>
      ) : (
        <div className="flex gap-5">
          <aside className="w-52 flex-shrink-0">
            <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden sticky top-4">
              {categories.map((cat) => {
                const available = cat.items.filter((i) => i.is_available).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-[#27272A] last:border-0 transition-all",
                      activeCategory === cat.id ? "bg-[#7C3AED]/10 text-[#A78BFA]" : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/5"
                    )}
                  >
                    <span>{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cat.name}</p>
                      <p className="text-[10px] opacity-70">{available}/{cat.items.length} available</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {activecat && (
              <div className="space-y-3">
                {activecat.items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "bg-[#111113] border rounded-2xl p-4 flex items-center gap-4 transition-all",
                      item.is_available ? "border-[#27272A]" : "border-[#27272A] opacity-60"
                    )}
                  >
                    {item.image ? (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-[#18181B] border border-[#27272A]" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#FAFAFA] font-medium text-sm">{item.name}</p>
                        {item.is_veg !== false && <Leaf size={12} className="text-[#4ADE80] flex-shrink-0" />}
                        {item.is_bestseller && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-semibold flex-shrink-0">
                            <Flame size={9} /> Best
                          </span>
                        )}
                        {!item.is_available && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F87171]/10 text-[#F87171] font-semibold">
                            Unavailable
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-[#71717A] text-xs mt-0.5 truncate">{item.description}</p>}
                      <p className="text-[#A78BFA] font-semibold text-sm mt-1">{formatCurrency(item.price)}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditForm(item)}
                        className="w-8 h-8 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#A78BFA]/50 transition-colors flex items-center justify-center"
                        title="Edit item"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-8 h-8 rounded-lg border border-[#27272A] text-[#F87171] hover:border-[#F87171]/50 transition-colors flex items-center justify-center"
                        title="Delete item"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => handleToggle(item.id, item.is_available)}
                        disabled={togglingId === item.id}
                        className="transition-opacity disabled:opacity-50"
                        title={item.is_available ? "Mark unavailable" : "Mark available"}
                      >
                        {togglingId === item.id ? (
                          <Loader2 size={22} className="animate-spin text-[#7C3AED]" />
                        ) : item.is_available ? (
                          <ToggleRight size={28} className="text-[#4ADE80]" />
                        ) : (
                          <ToggleLeft size={28} className="text-[#52525B]" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFormOpen(false)}>
          <div className="w-full max-w-lg bg-[#111113] border border-[#27272A] rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#FAFAFA] font-semibold text-lg">{formTitle}</h2>
              <button onClick={() => setFormOpen(false)} className="text-[#A1A1AA] hover:text-[#FAFAFA]">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-[#A1A1AA] text-xs mb-1.5 block">Category</span>
                <input
                  list="menu-categories"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  disabled={Boolean(editingItemId)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-sm text-[#FAFAFA] outline-none"
                  placeholder="Type or select category"
                />
                <datalist id="menu-categories">
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name} />
                  ))}
                </datalist>
                {!editingItemId && (
                  <p className="text-[#71717A] text-[11px] mt-1">Type to see matching categories. A new one is created automatically if needed.</p>
                )}
              </label>

              <label className="block">
                <span className="text-[#A1A1AA] text-xs mb-1.5 block">Item Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-sm text-[#FAFAFA] outline-none"
                  placeholder="E.g. Masala Dosa"
                />
              </label>

              <label className="block">
                <span className="text-[#A1A1AA] text-xs mb-1.5 block">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-sm text-[#FAFAFA] outline-none resize-none"
                  rows={3}
                  placeholder="Short description"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[#A1A1AA] text-xs mb-1.5 block">Price (INR)</span>
                  <input
                    type="number"
                    min="1"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-sm text-[#FAFAFA] outline-none"
                    placeholder="75"
                  />
                </label>

                <label className="block">
                  <span className="text-[#A1A1AA] text-xs mb-1.5 block">Image URL</span>
                  <input
                    value={form.image}
                    onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-sm text-[#FAFAFA] outline-none"
                    placeholder="https://..."
                  />
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] text-xs cursor-pointer hover:text-[#FAFAFA] transition-colors">
                        <Camera size={12} />
                        Choose image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={imageUploading}
                          onChange={(e) => {
                            handleImageSelected(e.target.files?.[0] ?? null);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] text-xs cursor-pointer hover:text-[#FAFAFA] transition-colors">
                        <Camera size={12} />
                        Use camera
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          disabled={imageUploading}
                          onChange={(e) => {
                            handleImageSelected(e.target.files?.[0] ?? null);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {imagePreviewUrl && (
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreviewUrl} alt="Menu preview" className="w-11 h-11 rounded-lg object-cover border border-[#27272A]" />
                        <button
                          type="button"
                          onClick={handleImageUpload}
                          disabled={imageUploading}
                          className="px-2.5 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs hover:bg-[#6D28D9] disabled:opacity-70"
                        >
                          {imageUploading ? "Uploading..." : "Upload selected"}
                        </button>
                        <button
                          type="button"
                          onClick={clearSelectedImage}
                          disabled={imageUploading}
                          className="px-2.5 py-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] text-xs hover:text-[#FAFAFA]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {form.image && !imagePreviewUrl && <span className="text-[#71717A] text-xs truncate">Image ready</span>}
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2 text-[#A1A1AA]">
                  <input
                    type="checkbox"
                    checked={form.is_veg}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_veg: e.target.checked }))}
                    className="accent-[#7C3AED]"
                  />
                  Veg item
                </label>
                <label className="flex items-center gap-2 text-[#A1A1AA]">
                  <input
                    type="checkbox"
                    checked={form.is_bestseller}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_bestseller: e.target.checked }))}
                    className="accent-[#7C3AED]"
                  />
                  Bestseller
                </label>
                <label className="flex items-center gap-2 text-[#A1A1AA]">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_available: e.target.checked }))}
                    className="accent-[#7C3AED]"
                  />
                  Available now
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={formSaving}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium",
                  formSaving ? "bg-[#27272A] text-[#71717A]" : "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                )}
              >
                {formSaving ? "Saving..." : editingItemId ? "Update Item" : "Create Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
