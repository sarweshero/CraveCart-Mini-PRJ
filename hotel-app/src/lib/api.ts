import type { Hotel, HotelOrder, HotelReview, AITemplate, MenuCategory, DashboardStats, ReviewsResponse, OrderStatus } from "./types";
import { createClient as createSupabaseClient } from "./client";

export const API_MODE: "mock" | "live" =
  (process.env.NEXT_PUBLIC_API_MODE as "mock" | "live") ?? "live";
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SUPABASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "cravecart-media";
const MEDIA_UPLOAD_PROVIDER = (process.env.NEXT_PUBLIC_MEDIA_UPLOAD_PROVIDER ?? "backend").toLowerCase();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockData = require("../mock/api.json");

function getToken() { return typeof window !== "undefined" ? localStorage.getItem("cravecart_hotel_token") : null; }
function getRefreshToken() { return typeof window !== "undefined" ? localStorage.getItem("cravecart_hotel_refresh_token") : null; }

async function request<T>(path: string, options: RequestInit = {}, _retry = true): Promise<T> {
  const token = getToken();
  const headers: Record<string,string> = { "Content-Type": "application/json", ...(options.headers as Record<string,string>) };
  if (token) headers["Authorization"] = `Token ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }

  // Auto-refresh on 401
  if (res.status === 401 && _retry) {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        const r = await fetch(`${BASE_URL}/api/hotel/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (r.ok) {
          const d = await r.json();
          localStorage.setItem("cravecart_hotel_token", d.token);
          if (d.refresh_token) localStorage.setItem("cravecart_hotel_refresh_token", d.refresh_token);
          document.cookie = `cravecart_hotel_token=${d.token}; path=/; max-age=86400; SameSite=Lax`;
          return request<T>(path, options, false);
        }
      } catch { /* refresh failed */ }
    }
    // Session truly expired
    localStorage.removeItem("cravecart_hotel_token");
    localStorage.removeItem("cravecart_hotel_refresh_token");
    document.cookie = "cravecart_hotel_token=; path=/; max-age=0";
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cravecart:hotel-session-expired"));
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.message ?? b.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
function mock<T>(v: T, delay = 400): Promise<T> { return new Promise(r => setTimeout(() => r(v), delay)); }

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}

function extensionFromFile(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "";
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  const fromMime = file.type.split("/")[1]?.toLowerCase();
  if (fromMime && /^[a-z0-9.+-]+$/.test(fromMime)) {
    if (fromMime === "jpeg") return "jpg";
    return fromMime;
  }
  return "jpg";
}

function buildSupabaseObjectKey(file: File, folder = "uploads/general") {
  const cleanedFolder = folder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "") || "uploads/general";
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const ext = extensionFromFile(file);
  const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now()}${Math.floor(Math.random() * 100000)}`;

  return `${cleanedFolder}/${yyyy}/${mm}/${dd}/${id}.${ext}`;
}

function extractSupabaseKey(url: string, bucket = SUPABASE_STORAGE_BUCKET): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    const publicPrefix = `storage/v1/object/public/${bucket}/`;
    const s3Prefix = `storage/v1/s3/${bucket}/`;

    if (path.startsWith(publicPrefix)) return path.slice(publicPrefix.length);
    if (path.startsWith(s3Prefix)) return path.slice(s3Prefix.length);
    if (path.startsWith(`${bucket}/`)) return path.slice(bucket.length + 1);
  } catch {
    return null;
  }
  return null;
}

async function uploadImageViaSupabase(file: File, options?: { folder?: string; replaceUrl?: string }): Promise<{ url: string }> {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const supabase = createSupabaseClient();
  const objectKey = buildSupabaseObjectKey(file, options?.folder ?? "uploads/general");

  const { data, error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(objectKey, file, { upsert: false, contentType: file.type || undefined });

  if (error || !data) {
    throw new Error(error?.message ?? "Image upload failed");
  }

  if (options?.replaceUrl) {
    const previousKey = extractSupabaseKey(options.replaceUrl, SUPABASE_STORAGE_BUCKET);
    if (previousKey) {
      await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([previousKey]);
    }
  }

  const { data: publicData } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(data.path);
  return { url: publicData.publicUrl };
}

type HotelLoginRawResponse = {
  token: string;
  refresh_token: string;
  expires_in?: number;
  hotel?: Partial<Hotel>;
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
    role?: "hotel_admin" | "customer";
    is_profile_complete?: boolean;
  };
};

type HotelLoginResponse = {
  token: string;
  refresh_token: string;
  hotel: Hotel;
};

type HotelDashboardProfile = {
  id: string;
  restaurant_name?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  description?: string;
  phone?: string;
  timings?: string;
  thumbnail?: string;
  cover_image?: string;
  address?: string;
  city?: string;
  area?: string;
  is_open?: boolean;
};

function normalizeHotel(raw: HotelLoginRawResponse): Hotel {
  const hotel = raw.hotel ?? {};
  const user = raw.user;
  const fallbackName = user?.name || user?.email?.split("@")[0] || "Partner";

  return {
    id: hotel.id ?? user?.id ?? "",
    owner_name: hotel.owner_name ?? fallbackName,
    email: hotel.email ?? user?.email ?? "",
    restaurant_name: hotel.restaurant_name ?? `${fallbackName}'s Restaurant`,
    avatar: hotel.avatar ?? user?.avatar,
    thumbnail: hotel.thumbnail,
    cover_image: hotel.cover_image,
    phone: hotel.phone,
    timings: hotel.timings,
    is_profile_complete: hotel.is_profile_complete ?? user?.is_profile_complete,
    role: hotel.role ?? (user?.role === "hotel_admin" ? "hotel_admin" : "hotel_admin"),
    is_open: hotel.is_open,
  };
}

export const hotelAuthApi = {
  login: async (email: string, password: string): Promise<HotelLoginResponse> => {
    if (API_MODE === "mock") return mock(mockData.auth["POST /api/hotel/auth/login"]);
    const raw = await request<HotelLoginRawResponse>("/api/hotel/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    return {
      token: raw.token,
      refresh_token: raw.refresh_token,
      hotel: normalizeHotel(raw),
    };
  },
  logout: async () => { if (API_MODE === "mock") return mock(undefined); return request("/api/hotel/auth/logout/", { method: "POST" }); },
  updateProfile: async (payload: { name?: string; phone?: string; avatar?: string }): Promise<{ name?: string; phone?: string; avatar?: string }> => {
    if (API_MODE === "mock") return mock(payload);
    return request("/api/hotel/auth/me/", { method: "PATCH", body: JSON.stringify(payload) });
  },
  toggleOpen: async (is_open: boolean) => {
    if (API_MODE === "mock") return mock({ is_open });
    return request<{ is_open: boolean }>("/api/hotel/dashboard/toggle-open/", { method: "PATCH", body: JSON.stringify({ is_open }) });
  },
};

export const dashboardApi = {
  stats: async (): Promise<DashboardStats> => {
    if (API_MODE === "mock") return mock(mockData.dashboard["GET /api/hotel/dashboard/stats"]);
    return request("/api/hotel/dashboard/stats/");
  },
  profile: async (): Promise<HotelDashboardProfile> => {
    if (API_MODE === "mock") {
      const auth = mockData.auth["POST /api/hotel/auth/login"];
      return mock({
        id: auth.hotel?.id ?? auth.user?.id,
        restaurant_name: auth.hotel?.restaurant_name,
        owner_name: auth.hotel?.owner_name,
        owner_email: auth.hotel?.email,
        phone: auth.hotel?.phone,
        timings: auth.hotel?.timings,
        thumbnail: auth.hotel?.thumbnail,
        cover_image: auth.hotel?.cover_image,
        is_open: auth.hotel?.is_open,
      });
    }
    return request("/api/hotel/dashboard/profile/");
  },
  updateProfile: async (payload: Partial<HotelDashboardProfile>): Promise<HotelDashboardProfile> => {
    if (API_MODE === "mock") return mock(payload as HotelDashboardProfile);
    return request("/api/hotel/dashboard/profile/", { method: "PATCH", body: JSON.stringify(payload) });
  },
};

export const hotelOrderApi = {
  list: async (status?: string): Promise<{ count: number; results: HotelOrder[] }> => {
    if (API_MODE === "mock") return mock(mockData.orders["GET /api/hotel/orders"]);
    const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/api/hotel/orders/${query}`);
  },
  updateStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/hotel/orders/${orderId}/status/`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
};

export const hotelReviewApi = {
  list: async (): Promise<ReviewsResponse> => {
    if (API_MODE === "mock") return mock(mockData.reviews["GET /api/hotel/reviews"]);
    return request("/api/hotel/reviews/");
  },
  regenerateAI: async (reviewId: string): Promise<{ ai_response: AITemplate }> => {
    if (API_MODE === "mock") return mock({ ai_response: { id: "regen_01", text: "Regenerated AI response...", generated_at: new Date().toISOString(), template_used: "Custom", email_sent: false } as unknown as AITemplate });
    return request(`/api/hotel/reviews/${reviewId}/generate-ai-response/`, { method: "POST" });
  },
  generateAiResponse: async (reviewId: string, templateId?: string): Promise<{ ai_response: AITemplate }> => {
    if (API_MODE === "mock") {
      return mock({ ai_response: { id: "regen_01", text: "Regenerated AI response...", generated_at: new Date().toISOString(), template_used: templateId ?? "Custom", email_sent: false } as unknown as AITemplate });
    }
    return request(`/api/hotel/reviews/${reviewId}/generate-ai-response/`, {
      method: "POST",
      body: JSON.stringify(templateId ? { template_id: templateId } : {}),
    });
  },
  resendEmail: async (reviewId: string): Promise<{ message: string }> => {
    if (API_MODE === "mock") return mock({ message: "Email resent successfully." });
    return request(`/api/hotel/reviews/${reviewId}/send-response/`, { method: "POST" });
  },
  sendAiResponse: async (reviewId: string, _aiResponseId: string): Promise<{ message: string }> => {
    if (API_MODE === "mock") return mock({ message: "Email resent successfully." });
    return request(`/api/hotel/reviews/${reviewId}/send-response/`, { method: "POST" });
  },
};

export const aiTemplateApi = {
  list: async (): Promise<AITemplate[]> => {
    if (API_MODE === "mock") return mock(mockData.ai_templates["GET /api/hotel/ai-templates"]);
    return request("/api/hotel/ai-templates/");
  },
  setActive: async (id: string): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/hotel/ai-templates/${id}/set-active/`, { method: "POST" });
  },
  create: async (data: Partial<AITemplate>): Promise<AITemplate> => {
    if (API_MODE === "mock") return mock({ ...data, id: `tmpl_${Date.now()}`, created_at: new Date().toISOString(), last_used: "", usage_count: 0 } as AITemplate);
    return request("/api/hotel/ai-templates/", { method: "POST", body: JSON.stringify(data) });
  },
  update: async (id: string, data: Partial<AITemplate>): Promise<AITemplate> => {
    if (API_MODE === "mock") return mock({ ...data, id } as AITemplate);
    return request(`/api/hotel/ai-templates/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  },
  delete: async (id: string): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/hotel/ai-templates/${id}/`, { method: "DELETE" });
  },
};

// Backward-compatible alias used by dashboard pages.
export const templateApi = aiTemplateApi;

export const menuApi = {
  list: async (): Promise<{ categories: MenuCategory[] }> => {
    if (API_MODE === "mock") return mock(mockData.menu["GET /api/hotel/menu"]);
    return request("/api/hotel/menu/");
  },
  createItem: async (payload: {
    category_id?: string;
    category_name?: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    is_veg?: boolean;
    is_bestseller?: boolean;
    is_available?: boolean;
  }): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request("/api/hotel/menu/", { method: "POST", body: JSON.stringify(payload) });
  },
  toggleAvailability: async (itemId: string): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/hotel/menu/items/${itemId}/toggle/`, { method: "PATCH" });
  },
  updateItem: async (itemId: string, payload: {
    name?: string;
    description?: string;
    price?: number;
    image?: string;
    is_veg?: boolean;
    is_bestseller?: boolean;
    is_available?: boolean;
  }): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/hotel/menu/items/${itemId}/`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteItem: async (itemId: string): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/hotel/menu/items/${itemId}/`, { method: "DELETE" });
  },
};

export const mediaApi = {
  uploadImage: async (file: File, options?: { folder?: string; replaceUrl?: string }): Promise<{ url: string }> => {
    if (API_MODE === "mock") return mock({ url: URL.createObjectURL(file) });

    if (MEDIA_UPLOAD_PROVIDER === "supabase") {
      return uploadImageViaSupabase(file, options);
    }

    const token = getToken();
    if (!token) throw new Error("Please login to upload images.");

    const formData = new FormData();
    formData.append("file", file);
    if (options?.folder) formData.append("folder", options.folder);
    if (options?.replaceUrl) formData.append("replace_url", options.replaceUrl);

    const res = await fetch(`${BASE_URL}/api/hotel/auth/media/upload/`, {
      method: "POST",
      headers: { Authorization: `Token ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const backendError = new Error(body.message ?? "Image upload failed");
      if (hasSupabaseEnv()) {
        return uploadImageViaSupabase(file, options);
      }
      throw backendError;
    }

    return res.json();
  },
};

export interface HotelCoupon {
  id: string;
  code: string;
  description: string;
  coupon_type: "percentage" | "flat";
  value: number;
  max_discount?: number;
  min_order: number;
  max_uses?: number;
  used_count: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

const _mockCoupons: HotelCoupon[] = [
  { id: "1", code: "WELCOME50", description: "50% off for new customers", coupon_type: "percentage", value: 50, max_discount: 100, min_order: 200, max_uses: 100, used_count: 23, is_active: true, expires_at: new Date(Date.now() + 7*86400000).toISOString(), created_at: new Date().toISOString() },
  { id: "2", code: "FEAST30", description: "₹30 flat off on all orders", coupon_type: "flat", value: 30, min_order: 150, used_count: 41, is_active: true, expires_at: new Date(Date.now() + 14*86400000).toISOString(), created_at: new Date().toISOString() },
];
let _couponsStore = [..._mockCoupons];

export const hotelCouponApi = {
  list: async (): Promise<HotelCoupon[]> => {
    if (API_MODE === "mock") return mock([..._couponsStore]);
    return request("/api/hotel/coupons/");
  },
  create: async (data: { code: string; description: string; coupon_type: "percentage" | "flat"; value: number; max_discount?: number; min_order: number; max_uses?: number; expires_at: string; }): Promise<HotelCoupon> => {
    if (API_MODE === "mock") {
      const c: HotelCoupon = { ...data, id: String(Date.now()), used_count: 0, is_active: true, created_at: new Date().toISOString() };
      _couponsStore = [c, ..._couponsStore];
      return mock(c);
    }
    return request("/api/hotel/coupons/", { method: "POST", body: JSON.stringify(data) });
  },
  toggle: async (id: string, is_active: boolean): Promise<HotelCoupon> => {
    if (API_MODE === "mock") {
      _couponsStore = _couponsStore.map(c => c.id === id ? { ...c, is_active } : c);
      return mock(_couponsStore.find(c => c.id === id)!);
    }
    return request(`/api/hotel/coupons/${id}/`, { method: "PATCH", body: JSON.stringify({ is_active }) });
  },
  delete: async (id: string): Promise<void> => {
    if (API_MODE === "mock") { _couponsStore = _couponsStore.filter(c => c.id !== id); return mock(undefined); }
    return request(`/api/hotel/coupons/${id}/`, { method: "DELETE" });
  },
};
