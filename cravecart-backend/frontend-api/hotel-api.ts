// ============================================================
// CraveCart Hotel App — API Service Layer
// Connected to Django REST Framework backend.
// Toggle API_MODE to "mock" to run against local JSON fixtures.
// ============================================================

import type {
  Hotel, HotelOrder, HotelReview, AITemplate,
  MenuCategory, DashboardStats, ReviewsResponse, OrderStatus,
} from "./types";

// ─── Mode switch ────────────────────────────────────────────
export const API_MODE: "mock" | "live" =
  (process.env.NEXT_PUBLIC_API_MODE as "mock" | "live") ?? "live";

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockData = require("../mock/api.json");
function mock<T>(v: T, delay = 400): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), delay));
}

// ─── Error class ────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string | string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Token helpers ──────────────────────────────────────────
const TOKEN_KEY   = "cravecart_hotel_token";
const REFRESH_KEY = "cravecart_hotel_refresh_token";

function getToken():   string | null { return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY)   : null; }
function getRefresh(): string | null { return typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null; }

export function saveTokens(token: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY,   token);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefresh();
  if (!refresh) throw new ApiError("No refresh token. Please log in again.", 401);

  const res = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) {
    clearTokens();
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const data = await res.json();
  saveTokens(data.token, data.refresh_token);
  return data.token;
}

// ─── Core request with auto-refresh ─────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  _retry = true
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Token ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && _retry) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      await refreshPromise;
      return request<T>(path, options, false);
    } catch {
      clearTokens();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cravecart:hotel-session-expired"));
      }
      throw new ApiError("Session expired. Please log in again.", 401);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.message ?? body.detail ?? "Request failed",
      res.status,
      body.errors
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

export const hotelAuthApi = {
  login: async (
    email: string,
    password: string
  ): Promise<{ token: string; refresh_token: string; expires_in: number; hotel: Hotel }> => {
    if (API_MODE === "mock") return mock(mockData.auth["POST /api/hotel/auth/login"]);
    // Hotel admins use the same login endpoint — role is checked server-side
    const res = await request<{ token: string; refresh_token: string; expires_in: number; user: Hotel }>(
      "/api/hotel/auth/login/", { method: "POST", body: JSON.stringify({ email, password }) }
    );
    saveTokens(res.token, res.refresh_token);
    // Backend returns `user` key, we alias as `hotel` for the frontend store
    return { ...res, hotel: res.user };
  },

  logout: async (): Promise<void> => {
    if (API_MODE === "mock") { clearTokens(); return mock(undefined); }
    try {
      await request("/api/hotel/auth/logout/", { method: "POST" });
    } finally {
      clearTokens();
    }
  },

  me: async (): Promise<Hotel> => {
    if (API_MODE === "mock") return mock(mockData.auth["POST /api/hotel/auth/login"].hotel);
    const res = await request<Hotel>("/api/hotel/auth/me/");
    return res;
  },

  // Backend: PATCH /api/hotel/dashboard/toggle-open/
  toggleOpen: async (is_open: boolean): Promise<{ is_open: boolean; message: string }> => {
    if (API_MODE === "mock") return mock({ is_open, message: `Restaurant is now ${is_open ? "open" : "closed"}.` });
    return request("/api/hotel/dashboard/toggle-open/", {
      method: "PATCH",
      body: JSON.stringify({ is_open }),
    });
  },
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: async (): Promise<DashboardStats> => {
    if (API_MODE === "mock") return mock(mockData.dashboard["GET /api/hotel/dashboard/stats"]);
    return request("/api/hotel/dashboard/stats/");
  },
};

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────

export const hotelOrderApi = {
  list: async (
    statusFilter?: string
  ): Promise<{ count: number; next: string | null; previous: string | null; results: HotelOrder[] }> => {
    if (API_MODE === "mock") {
      const all: HotelOrder[] = mockData.orders["GET /api/hotel/orders"].results;
      const filtered = statusFilter && statusFilter !== "all"
        ? all.filter((o) => o.status === statusFilter)
        : all;
      return mock({ count: filtered.length, next: null, previous: null, results: filtered });
    }
    const params = statusFilter && statusFilter !== "all" ? `?status=${statusFilter}` : "";
    return request(`/api/hotel/orders/${params}`);
  },

  // Backend: PATCH /api/hotel/orders/<id>/status/
  // Pass the target status explicitly — backend validates the transition
  updateStatus: async (orderId: string, status: OrderStatus): Promise<{ message: string; status: OrderStatus }> => {
    if (API_MODE === "mock") return mock({ message: `Order ${orderId} updated to ${status}`, status });
    return request(`/api/hotel/orders/${orderId}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};

// ─────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────

export const hotelReviewApi = {
  list: async (params?: {
    rating?: number;
    has_response?: boolean;
    page?: number;
  }): Promise<ReviewsResponse> => {
    if (API_MODE === "mock") return mock(mockData.reviews["GET /api/hotel/reviews"]);
    const qs = new URLSearchParams();
    if (params?.rating)        qs.set("rating",       String(params.rating));
    if (params?.has_response != null) qs.set("has_response", String(params.has_response));
    if (params?.page)          qs.set("page",         String(params.page));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/api/hotel/reviews/${query}`);
  },

  // Backend: POST /api/hotel/reviews/<id>/generate-ai-response/
  // (was: /regenerate-ai/)
  generateAI: async (
    reviewId: string,
    templateId?: string
  ): Promise<{ ai_response: { id: number; text: string; generated_at: string; email_sent: boolean; generation_status: string } }> => {
    if (API_MODE === "mock") {
      return mock({
        ai_response: {
          id:                1,
          text:              "Dear valued customer, thank you for your wonderful feedback! We are absolutely delighted that you enjoyed the experience. Your kind words inspire our entire team to keep delivering excellence. We hope to serve you again very soon! 🙏",
          generated_at:      new Date().toISOString(),
          email_sent:        false,
          generation_status: "completed",
        },
      });
    }
    return request(`/api/hotel/reviews/${reviewId}/generate-ai-response/`, {
      method: "POST",
      body: JSON.stringify(templateId ? { template_id: templateId } : {}),
    });
  },

  // Backend: POST /api/hotel/reviews/<id>/send-response/
  // (was: /resend-email/)
  sendEmail: async (reviewId: string): Promise<{ message: string; email_sent: boolean }> => {
    if (API_MODE === "mock") return mock({ message: "Email sent successfully.", email_sent: true });
    return request(`/api/hotel/reviews/${reviewId}/send-response/`, { method: "POST" });
  },
};

// ─────────────────────────────────────────────────────────────
// AI TEMPLATES
// ─────────────────────────────────────────────────────────────

export const aiTemplateApi = {
  list: async (): Promise<AITemplate[]> => {
    if (API_MODE === "mock") return mock(mockData.ai_templates["GET /api/hotel/ai-templates"]);
    return request("/api/hotel/ai-templates/");
  },

  create: async (data: {
    name: string;
    description?: string;
    tone: string;
    prompt_instructions: string;
    is_active?: boolean;
  }): Promise<AITemplate> => {
    if (API_MODE === "mock")
      return mock({ ...data, id: `tmpl_${Date.now()}`, usage_count: 0, created_at: new Date().toISOString() } as unknown as AITemplate);
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

  // Backend: POST /api/hotel/ai-templates/<id>/set-active/
  // Deactivates all other templates for this restaurant first (enforced server-side)
  setActive: async (id: string): Promise<{ message: string }> => {
    if (API_MODE === "mock") return mock({ message: "Template set as active." });
    return request(`/api/hotel/ai-templates/${id}/set-active/`, { method: "POST" });
  },
};

// ─────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────

export const menuApi = {
  list: async (): Promise<{ categories: MenuCategory[] }> => {
    if (API_MODE === "mock") return mock(mockData.menu["GET /api/hotel/menu"]);
    return request("/api/hotel/menu/");
  },

  // Backend: PATCH /api/hotel/menu/items/<id>/toggle/
  // (not PATCH /items/<id>/ — the toggle has its own endpoint)
  toggleAvailability: async (
    itemId: string,
    is_available: boolean
  ): Promise<{ id: number; is_available: boolean; message: string }> => {
    if (API_MODE === "mock") return mock({ id: Number(itemId), is_available, message: `Item marked as ${is_available ? "available" : "unavailable"}.` });
    return request(`/api/hotel/menu/items/${itemId}/toggle/`, { method: "PATCH" });
    // Note: the toggle endpoint flips the current value server-side;
    // the is_available param is ignored by the backend (it just toggles).
    // If you need to SET a specific value, use updateItem instead.
  },

  // Backend: PATCH /api/hotel/menu/items/<id>/
  updateItem: async (
    itemId: string,
    data: { price?: number; is_available?: boolean; name?: string; description?: string }
  ): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/hotel/menu/items/${itemId}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
