// ============================================================
// CraveCart Customer App — API Service Layer
// ============================================================

import type {
  User, AuthTokens, LoginPayload, RegisterPayload, CompleteProfilePayload,
  Restaurant, RestaurantDetail, Cart, Order, OrderDetail,
  ReviewPayload, Review, Coupon,
  PaginatedResponse, RestaurantFilters, Address,
} from "./types";

export const API_MODE: "mock" | "live" =
  (process.env.NEXT_PUBLIC_API_MODE as "mock" | "live") ?? "live";

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockData = require("../mock/api.json");
function mock<T>(v: T, delay = 400): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), delay));
}

const toNum = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// ── Error class ─────────────────────────────────────────────
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

// ── Token helpers ────────────────────────────────────────────
const TOKEN_KEY   = "cravecart_token";
const REFRESH_KEY = "cravecart_refresh_token";

export function getToken():   string | null { return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY)   : null; }
export function getRefresh(): string | null { return typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null; }

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
  if (!refresh) throw new ApiError("No refresh token available. Please log in again.", 401);

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

// ── Core request with auto-refresh on 401 ────────────────────
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

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Unable to reach the server. Check your connection and try again.", 0);
  }

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
        window.dispatchEvent(new CustomEvent("cravecart:session-expired"));
      }
      throw new ApiError("Session expired. Please log in again.", 401);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.message ?? body.detail ?? "Something went wrong",
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

export const authApi = {
  login: async (payload: LoginPayload): Promise<{ user: User } & AuthTokens> => {
    if (API_MODE === "mock") return mock(mockData.auth.login["POST /api/auth/login"]);
    const res = await request<{ user: User } & AuthTokens>(
      "/api/auth/login/", { method: "POST", body: JSON.stringify(payload) }
    );
    saveTokens(res.token, res.refresh_token);
    return res;
  },

  register: async (payload: RegisterPayload): Promise<{ message: string; user: Partial<User> } & AuthTokens> => {
    if (API_MODE === "mock") return mock(mockData.auth.register["POST /api/auth/register"]);
    const res = await request<{ message: string; user: Partial<User> } & AuthTokens>(
      "/api/auth/register/", { method: "POST", body: JSON.stringify(payload) }
    );
    if (res.token) saveTokens(res.token, res.refresh_token);
    return res;
  },

  googleOAuth: (): void => {
    if (API_MODE === "mock") { alert("[Mock] Redirecting to Google OAuth…"); return; }
    window.location.href = `${BASE_URL}/api/auth/google/`;
  },

  completeProfile: async (payload: CompleteProfilePayload): Promise<{ message: string; user: User }> => {
    if (API_MODE === "mock") return mock(mockData.auth.complete_profile["POST /api/auth/complete-profile"]);
    return request("/api/auth/complete-profile/", { method: "POST", body: JSON.stringify(payload) });
  },

  me: async (): Promise<User> => {
    if (API_MODE === "mock") return mock(mockData.auth.me["GET /api/auth/me"]);
    return request("/api/auth/me/");
  },

  updateProfile: async (payload: Partial<User>): Promise<User> => {
    if (API_MODE === "mock") return mock({ ...mockData.auth.me["GET /api/auth/me"], ...payload });
    return request("/api/auth/me/", { method: "PATCH", body: JSON.stringify(payload) });
  },

  logout: async (): Promise<void> => {
    if (API_MODE === "mock") { clearTokens(); return mock(undefined); }
    try { await request("/api/auth/logout/", { method: "POST" }); } finally { clearTokens(); }
  },

  refreshToken: async (): Promise<AuthTokens> => {
    if (API_MODE === "mock") return mock({ token: "mock_refreshed", refresh_token: getRefresh() ?? "", expires_in: 2592000 });
    return refreshAccessToken().then((token) => ({
      token, refresh_token: getRefresh() ?? "", expires_in: 2592000,
    }));
  },

  deleteAccount: async (payload: { type: "temporary" | "permanent"; password?: string }): Promise<{ message: string; type: string }> => {
    if (API_MODE === "mock") { clearTokens(); return mock({ message: `Account ${payload.type} deletion initiated.`, type: payload.type }); }
    const res = await request<{ message: string; type: string }>(
      "/api/auth/delete-account/", { method: "DELETE", body: JSON.stringify(payload) }
    );
    clearTokens();
    return res;
  },

  addAddress: async (address: Omit<Address, "id">): Promise<Address> => {
    if (API_MODE === "mock") return mock({ ...address, id: `addr_${Date.now()}` });
    return request("/api/auth/addresses/", { method: "POST", body: JSON.stringify(address) });
  },

  updateAddress: async (id: string, address: Partial<Address>): Promise<Address> => {
    if (API_MODE === "mock") return mock({ id, ...address } as Address);
    return request(`/api/auth/addresses/${id}/`, { method: "PATCH", body: JSON.stringify(address) });
  },

  deleteAddress: async (id: string): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/auth/addresses/${id}/`, { method: "DELETE" });
  },
};

export const mediaApi = {
  uploadImage: async (file: File, options?: { folder?: string; replaceUrl?: string }): Promise<{ url: string }> => {
    if (API_MODE === "mock") return mock({ url: URL.createObjectURL(file) });

    const token = getToken();
    if (!token) throw new ApiError("Please login to upload images.", 401);

    const formData = new FormData();
    formData.append("file", file);
    if (options?.folder) formData.append("folder", options.folder);
    if (options?.replaceUrl) formData.append("replace_url", options.replaceUrl);

    const res = await fetch(`${BASE_URL}/api/auth/media/upload/`, {
      method: "POST",
      headers: { Authorization: `Token ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(body.message ?? "Image upload failed", res.status, body.errors);
    }

    return res.json();
  },
};

// ─────────────────────────────────────────────────────────────
// RESTAURANTS
// ─────────────────────────────────────────────────────────────

export const restaurantApi = {
  list: async (filters?: RestaurantFilters): Promise<PaginatedResponse<Restaurant>> => {
    if (API_MODE === "mock") {
      let results: Restaurant[] = mockData.restaurants["GET /api/restaurants"].results;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        results = results.filter((r) => r.name.toLowerCase().includes(q) || r.cuisine_tags.some((t) => t.toLowerCase().includes(q)));
      }
      if (filters?.is_open) results = results.filter((r) => r.is_open);
      if (filters?.cuisine) results = results.filter((r) => r.cuisine_tags.includes(filters.cuisine!));
      return mock({ ...mockData.restaurants["GET /api/restaurants"], results, count: results.length });
    }
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters ?? {}).filter(([, v]) => v != null && v !== "")) as Record<string, string>
    ).toString();
    return request(`/api/restaurants/${params ? `?${params}` : ""}`);
  },

  get: async (id: string): Promise<RestaurantDetail> => {
    if (API_MODE === "mock") return mock(mockData.restaurants["GET /api/restaurants/:id"]);
    return request(`/api/restaurants/${id}/`);
  },

  categories: async (): Promise<{ id: string; name: string; icon: string; color: string }[]> => {
    if (API_MODE === "mock") return mock(mockData.categories["GET /api/categories"]);
    return request("/api/categories/");
  },

  featured: async (): Promise<Restaurant[]> => {
    if (API_MODE === "mock") return mock(mockData.restaurants["GET /api/restaurants"].results.filter((r: Restaurant) => r.is_featured));
    return request("/api/restaurants/featured/");
  },
};

// ─────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────

export const cartApi = {
  get: async (): Promise<Cart> => {
    if (API_MODE === "mock") return mock(mockData.cart["GET /api/cart"]);
    const cart = await request<Cart>("/api/cart/");
    return {
      ...cart,
      items: (cart.items ?? []).map((item) => ({
        ...item,
        quantity: toNum(item.quantity, 1),
        item_total: toNum(item.item_total),
        menu_item: {
          ...item.menu_item,
          price: toNum(item.menu_item.price),
        },
      })),
      subtotal: toNum(cart.subtotal),
      delivery_fee: toNum(cart.delivery_fee),
      platform_fee: toNum(cart.platform_fee),
      discount: toNum(cart.discount),
      taxes: toNum(cart.taxes),
      total: toNum(cart.total),
    };
  },

  addItem: async (
    menuItemId: string,
    quantity: number,
    customizations: string[] = []
  ): Promise<{ message: string; cart_item_id: number; conflict?: boolean; cart_restaurant?: { id: number; name: string } }> => {
    if (API_MODE === "mock") return mock(mockData.cart["POST /api/cart/add"]);
    return request("/api/cart/add/", {
      method: "POST",
      body: JSON.stringify({ menu_item_id: menuItemId, quantity, customizations }),
    });
  },

  updateItem: async (cartItemId: string, quantity: number): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    if (quantity <= 0) return cartApi.removeItem(cartItemId);
    return request(`/api/cart/items/${cartItemId}/`, { method: "PATCH", body: JSON.stringify({ quantity }) });
  },

  removeItem: async (cartItemId: string): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/cart/items/${cartItemId}/`, { method: "DELETE" });
  },

  applyCoupon: async (code: string): Promise<{ message: string; discount: number }> => {
    if (API_MODE === "mock") {
      const validMockCodes = ["SAVE10", "FEAST20", "CRAVE50", "WELCOME"];
      if (!validMockCodes.includes(code.toUpperCase())) {
        throw new ApiError("Invalid or expired coupon code.", 400);
      }
      return mock({ message: "Coupon applied!", discount: 50 });
    }
    // BUG FIX: let ApiError propagate — don't swallow it silently
    return request("/api/cart/apply-coupon/", { method: "POST", body: JSON.stringify({ code }) });
  },

  removeCoupon: async (): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request("/api/cart/remove-coupon/", { method: "POST" });
  },

  clear: async (): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request("/api/cart/clear/", { method: "POST" });
  },
};

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────

export const orderApi = {
  list: async (page = 1): Promise<PaginatedResponse<Order>> => {
    if (API_MODE === "mock") return mock(mockData.orders["GET /api/orders"]);
    const data = await request<PaginatedResponse<Order>>(`/api/orders/?page=${page}`);
    return {
      ...data,
      results: (data.results ?? []).map((order) => ({
        ...order,
        total: toNum(order.total),
      })),
    };
  },

  get: async (id: string): Promise<OrderDetail> => {
    if (API_MODE === "mock") return mock(mockData.orders["GET /api/orders/:id"]);
    const order = await request<OrderDetail>(`/api/orders/${id}/`);
    return {
      ...order,
      subtotal: toNum(order.subtotal),
      delivery_fee: toNum(order.delivery_fee),
      platform_fee: toNum(order.platform_fee),
      discount: toNum(order.discount),
      taxes: toNum(order.taxes),
      total: toNum(order.total),
      items: (order.items ?? []).map((item) => ({
        ...item,
        quantity: toNum(item.quantity, 1),
        price: toNum(item.price),
        item_total: toNum(item.item_total),
      })),
    };
  },

  place: async (payload: {
    delivery_address_id: string;
    payment_method: string;
    instructions?: string;
  }): Promise<{ id: string; status: string; total: number; estimated_delivery_time: number; message: string }> => {
    if (API_MODE === "mock") return mock(mockData.orders["POST /api/orders"]);
    const res = await request<{ id: string; status: string; total: number; estimated_delivery_time: number; message: string }>(
      "/api/orders/",
      { method: "POST", body: JSON.stringify(payload) }
    );
    return {
      ...res,
      total: toNum(res.total),
      estimated_delivery_time: toNum(res.estimated_delivery_time),
    };
  },

  cancel: async (orderId: string, reason?: string): Promise<{ message: string }> => {
    if (API_MODE === "mock") return mock({ message: "Order cancelled successfully." });
    return request(`/api/orders/${orderId}/cancel/`, {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? "Cancelled by customer" }),
    });
  },
};

// ─────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────

export const reviewApi = {
  submit: async (payload: ReviewPayload): Promise<{ id: number; message: string; review: Review }> => {
    if (API_MODE === "mock") return mock(mockData.reviews["POST /api/reviews"]);
    return request("/api/reviews/", { method: "POST", body: JSON.stringify(payload) });
  },

  getAiResponse: async (
    reviewId: string | number
  ): Promise<{ status: "pending" | "completed" | "failed"; ai_response?: Review["ai_response"] }> => {
    if (API_MODE === "mock") return mock(mockData.reviews["GET /api/reviews/:id/ai-response"]);
    return request(`/api/reviews/${reviewId}/ai-response/`);
  },
};

// ─────────────────────────────────────────────────────────────
// COUPONS
// ─────────────────────────────────────────────────────────────

export const couponApi = {
  list: async (): Promise<Coupon[]> => {
    if (API_MODE === "mock") return mock(mockData.coupons["GET /api/coupons"]);
    return request("/api/coupons/");
  },
};

// ─────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────

export const searchApi = {
  search: async (q: string): Promise<{
    restaurants: Restaurant[];
    dishes: { id: number; name: string; restaurant_id: number; restaurant_name: string; price: number; image: string }[];
  }> => {
    if (API_MODE === "mock") return mock(mockData.search["GET /api/search?q=biryani"]);
    return request(`/api/search/?q=${encodeURIComponent(q)}`);
  },
};
