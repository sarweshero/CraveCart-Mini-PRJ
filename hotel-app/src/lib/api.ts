import type { Hotel, HotelOrder, HotelReview, AITemplate, MenuCategory, DashboardStats, ReviewsResponse, OrderStatus } from "./types";

export const API_MODE: "mock" | "live" =
  (process.env.NEXT_PUBLIC_API_MODE as "mock" | "live") ?? "live";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.sarweshero.me";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockData = require("../mock/api.json");

function getToken() { return typeof window !== "undefined" ? localStorage.getItem("cravecart_hotel_token") : null; }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string,string> = { "Content-Type": "application/json", ...(options.headers as Record<string,string>) };
  if (token) headers["Authorization"] = `Token ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }
  if (!res.ok) { const b = await res.json().catch(()=>({})); throw new Error(b.message ?? "Request failed"); }
  return res.json();
}
function mock<T>(v: T, delay = 400): Promise<T> { return new Promise(r => setTimeout(() => r(v), delay)); }

export const hotelAuthApi = {
  login: async (email: string, password: string) => {
    if (API_MODE === "mock") return mock(mockData.auth["POST /api/hotel/auth/login"]);
    return request<{ token: string; refresh_token: string; hotel: Hotel }>("/api/hotel/auth/login/", { method: "POST", body: JSON.stringify({ email, password }) });
  },
  logout: async () => { if (API_MODE === "mock") return mock(undefined); return request("/api/hotel/auth/logout/", { method: "POST" }); },
  toggleOpen: async (is_open: boolean) => {
    if (API_MODE === "mock") return mock({ is_open });
    return request<{ is_open: boolean }>("/api/hotel/toggle-open/", { method: "POST", body: JSON.stringify({ is_open }) });
  },
};

export const dashboardApi = {
  stats: async (): Promise<DashboardStats> => {
    if (API_MODE === "mock") return mock(mockData.dashboard["GET /api/hotel/dashboard/stats"]);
    return request("/api/hotel/dashboard/stats/");
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
    return request(`/api/hotel/reviews/${reviewId}/regenerate-ai/`, { method: "POST" });
  },
  generateAiResponse: async (reviewId: string, templateId?: string): Promise<{ ai_response: AITemplate }> => {
    if (API_MODE === "mock") {
      return mock({ ai_response: { id: "regen_01", text: "Regenerated AI response...", generated_at: new Date().toISOString(), template_used: templateId ?? "Custom", email_sent: false } as unknown as AITemplate });
    }
    return request(`/api/hotel/reviews/${reviewId}/regenerate-ai/`, {
      method: "POST",
      body: JSON.stringify(templateId ? { template_id: templateId } : {}),
    });
  },
  resendEmail: async (reviewId: string): Promise<{ message: string }> => {
    if (API_MODE === "mock") return mock({ message: "Email resent successfully." });
    return request(`/api/hotel/reviews/${reviewId}/resend-email/`, { method: "POST" });
  },
  sendAiResponse: async (reviewId: string, _aiResponseId: string): Promise<{ message: string }> => {
    if (API_MODE === "mock") return mock({ message: "Email resent successfully." });
    return request(`/api/hotel/reviews/${reviewId}/resend-email/`, { method: "POST" });
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
  toggleAvailability: async (itemId: string, is_available: boolean): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/hotel/menu/items/${itemId}/`, { method: "PATCH", body: JSON.stringify({ is_available }) });
  },
  updatePrice: async (itemId: string, price: number): Promise<void> => {
    if (API_MODE === "mock") return mock(undefined);
    return request(`/api/hotel/menu/items/${itemId}/`, { method: "PATCH", body: JSON.stringify({ price }) });
  },
};
