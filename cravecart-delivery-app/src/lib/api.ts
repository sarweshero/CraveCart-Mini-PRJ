// CraveCart Delivery App — API Service Layer
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const API_MODE: "mock" | "live" = (process.env.NEXT_PUBLIC_API_MODE as "mock" | "live") ?? "mock";

export interface DeliveryPartner {
  id: number; name: string; email: string; phone: string; avatar: string; city: string;
  vehicle_type: "bike"|"bicycle"|"scooter"|"foot"; vehicle_number: string;
  is_verified: boolean; is_online: boolean;
  total_deliveries: number; total_earnings: number; rating_avg: number; rating_count: number;
  today_deliveries: number; today_earnings: number; acceptance_rate: number; joined_at: string;
}

export interface OrderSnapshot {
  id: string; restaurant_name: string; restaurant_address: string;
  customer_name: string; delivery_address: string;
  items_count: number; total: number; payment_method: string; instructions: string;
}

export interface Assignment {
  id: string; order: OrderSnapshot;
  status: "assigned"|"accepted"|"rejected"|"expired"|"picked_up"|"delivered"|"cancelled";
  base_earning: number; distance_km: number; bonus: number; total_earning: number;
  assigned_at: string; accepted_at: string|null; picked_up_at: string|null; delivered_at: string|null;
  expires_at: string|null; customer_rating: number|null; customer_tip: number;
}

export interface EarningsDashboard {
  today: { deliveries: number; earnings: number };
  this_week: { deliveries: number; earnings: number };
  this_month: { deliveries: number; earnings: number };
  history: { date: string; deliveries: number; earnings: number; online_hours: number; avg_rating: number }[];
  breakdown: { date: string; earnings: number; deliveries: number }[];
}

// Token helpers
const TOKEN_KEY = "cravecart_delivery_token";
const REFRESH_KEY = "cravecart_delivery_refresh";
export function getToken() { return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null; }
export function getRefresh() { return typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null; }
export function saveTokens(t: string, r: string) { localStorage.setItem(TOKEN_KEY, t); localStorage.setItem(REFRESH_KEY, r); }
export function clearTokens() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); }

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "ApiError"; }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Token ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401 && retry) {
    const refresh = getRefresh();
    if (refresh) {
      const r = await fetch(`${BASE_URL}/api/auth/token/refresh/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refresh }) });
      if (r.ok) { const d = await r.json(); saveTokens(d.token, d.refresh_token); return request<T>(path, options, false); }
    }
    clearTokens();
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("cravecart:delivery-session-expired"));
    throw new ApiError("Session expired.", 401);
  }
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new ApiError(b.message ?? b.detail ?? "Request failed", res.status); }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function delay<T>(v: T, ms = 500): Promise<T> { return new Promise(r => setTimeout(() => r(v), ms)); }

// Mock partner
const MOCK_PARTNER: DeliveryPartner = {
  id: 1, name: "Ravi Kumar", email: "ravi@example.com", phone: "9876543210",
  avatar: "", city: "Coimbatore", vehicle_type: "bike", vehicle_number: "TN38AB1234",
  is_verified: true, is_online: false,
  total_deliveries: 248, total_earnings: 18460, rating_avg: 4.8, rating_count: 212,
  today_deliveries: 0, today_earnings: 0, acceptance_rate: 94, joined_at: "2024-01-15T10:00:00Z",
};

const MOCK_ORDER: OrderSnapshot = {
  id: "ORD-DEMO-001", restaurant_name: "Murugan Idli Shop", restaurant_address: "RS Puram, Coimbatore",
  customer_name: "Arjun Kumar", delivery_address: "12/3, Avinashi Road, Peelamedu, Coimbatore - 641004",
  items_count: 3, total: 285, payment_method: "upi", instructions: "Please ring the bell twice",
};

const MOCK_ASSIGNMENT: Assignment = {
  id: "asgn-001", order: MOCK_ORDER, status: "assigned",
  base_earning: 25, distance_km: 3.2, bonus: 10, total_earning: 46,
  assigned_at: new Date().toISOString(), accepted_at: null, picked_up_at: null, delivered_at: null,
  expires_at: new Date(Date.now() + 55000).toISOString(), customer_rating: null, customer_tip: 0,
};

// Mock state machine
let _mockState: "idle" | "incoming" | "accepted" | "picked_up" = "idle";
let _pollCount = 0;
let _isOnline = false;

export const deliveryAuthApi = {
  register: async (payload: {
    email: string; password: string; name: string;
    phone: string; city: string; vehicle_type: string;
    vehicle_number: string; aadhar_number: string;
  }): Promise<{ token: string; refresh_token: string; partner: DeliveryPartner }> => {
    if (API_MODE === "mock") { saveTokens("mock_token", "mock_refresh"); return delay({ token: "mock_token", refresh_token: "mock_refresh", partner: { ...MOCK_PARTNER, name: payload.name, email: payload.email, city: payload.city, vehicle_type: payload.vehicle_type as DeliveryPartner["vehicle_type"], vehicle_number: payload.vehicle_number } }); }
    const res = await request<{ token: string; refresh_token: string; expires_in: number; partner: DeliveryPartner }>("/api/delivery/auth/register/", { method: "POST", body: JSON.stringify(payload) });
    saveTokens(res.token, res.refresh_token);
    return res;
  },

  login: async (email: string, password: string): Promise<{ token: string; refresh_token: string; partner: DeliveryPartner }> => {
    if (API_MODE === "mock") { saveTokens("mock_token", "mock_refresh"); return delay({ token: "mock_token", refresh_token: "mock_refresh", partner: MOCK_PARTNER }); }
    const res = await request<{ token: string; refresh_token: string; partner: DeliveryPartner }>("/api/delivery/auth/login/", { method: "POST", body: JSON.stringify({ email, password }) });
    saveTokens(res.token, res.refresh_token);
    return res;
  },

  me: async (): Promise<DeliveryPartner> => {
    if (API_MODE === "mock") return delay({ ...MOCK_PARTNER, is_online: _isOnline });
    return request("/api/delivery/auth/me/");
  },

  updateProfile: async (data: Partial<DeliveryPartner>): Promise<DeliveryPartner> => {
    if (API_MODE === "mock") return delay({ ...MOCK_PARTNER, ...data });
    return request("/api/delivery/auth/me/", { method: "PATCH", body: JSON.stringify(data) });
  },

  toggleOnline: async (): Promise<{ is_online: boolean; message: string }> => {
    if (API_MODE === "mock") {
      _isOnline = !_isOnline;
      if (!_isOnline) { _mockState = "idle"; _pollCount = 0; }
      return delay({ is_online: _isOnline, message: `You are now ${_isOnline ? "online" : "offline"}.` });
    }
    return request("/api/delivery/auth/toggle-online/", { method: "PATCH" });
  },

  logout: async () => { clearTokens(); _isOnline = false; _mockState = "idle"; _pollCount = 0; },
};

export const deliveryApi = {
  getActive: async (): Promise<{ type: "idle"|"incoming"|"active"; assignment?: Assignment }> => {
    if (API_MODE === "mock") {
      if (!_isOnline) return delay({ type: "idle" });
      _pollCount++;
      // Simulate incoming after 5 polls (~5s)
      if (_pollCount >= 5 && _mockState === "idle") _mockState = "incoming";
      if (_mockState === "incoming") return delay({ type: "incoming", assignment: { ...MOCK_ASSIGNMENT, expires_at: new Date(Date.now() + 55000).toISOString() } });
      if (_mockState === "accepted") return delay({ type: "active", assignment: { ...MOCK_ASSIGNMENT, status: "accepted", accepted_at: new Date().toISOString() } });
      if (_mockState === "picked_up") return delay({ type: "active", assignment: { ...MOCK_ASSIGNMENT, status: "picked_up", accepted_at: new Date(Date.now()-60000).toISOString(), picked_up_at: new Date().toISOString() } });
      return delay({ type: "idle" });
    }
    return request("/api/delivery/assignments/active/");
  },

  accept: async (id: string): Promise<{ message: string }> => {
    if (API_MODE === "mock") { _mockState = "accepted"; return delay({ message: "Delivery accepted! Head to the restaurant." }); }
    return request(`/api/delivery/assignments/${id}/accept/`, { method: "POST" });
  },

  reject: async (id: string): Promise<{ message: string }> => {
    if (API_MODE === "mock") { _mockState = "idle"; _pollCount = 0; return delay({ message: "Assignment rejected." }); }
    return request(`/api/delivery/assignments/${id}/reject/`, { method: "POST" });
  },

  pickup: async (id: string): Promise<{ message: string }> => {
    if (API_MODE === "mock") { _mockState = "picked_up"; return delay({ message: "Order picked up! Head to the customer." }); }
    return request(`/api/delivery/assignments/${id}/pickup/`, { method: "POST" });
  },

  deliver: async (id: string): Promise<{ message: string; earning: number }> => {
    if (API_MODE === "mock") { _mockState = "idle"; _pollCount = 0; return delay({ message: "Delivery completed! 🎉", earning: 46 }); }
    return request(`/api/delivery/assignments/${id}/deliver/`, { method: "POST" });
  },

  getHistory: async (page = 1): Promise<{ count: number; results: Assignment[] }> => {
    if (API_MODE === "mock") {
      const restaurants = ["Murugan Idli","Saravana Bhavan","KFC","Burger King","Pizza Hut"];
      const results: Assignment[] = Array.from({ length: 8 }, (_, i) => ({
        ...MOCK_ASSIGNMENT, id: `asgn-${i+1}`, status: "delivered" as const,
        total_earning: Math.floor(Math.random()*40)+25, customer_rating: Math.floor(Math.random()*2)+4,
        delivered_at: new Date(Date.now()-i*3600000).toISOString(),
        order: { ...MOCK_ASSIGNMENT.order, restaurant_name: restaurants[i%5], total: Math.floor(Math.random()*400)+100 },
      }));
      return delay({ count: 24, results });
    }
    return request(`/api/delivery/assignments/history/?page=${page}`);
  },

  getEarnings: async (): Promise<EarningsDashboard> => {
    if (API_MODE === "mock") {
      const today = new Date();
      return delay({
        today: { deliveries: 0, earnings: 0 },
        this_week: { deliveries: 18, earnings: 1350 },
        this_month: { deliveries: 72, earnings: 5400 },
        history: Array.from({ length: 14 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate()-i);
          return { date: d.toISOString().split("T")[0], deliveries: Math.floor(Math.random()*8)+2, earnings: Math.floor(Math.random()*300)+100, online_hours: +(Math.random()*6+2).toFixed(1), avg_rating: +(Math.random()*0.5+4.5).toFixed(1) };
        }),
        breakdown: Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate()-(6-i));
          return { date: d.toISOString().split("T")[0], earnings: Math.floor(Math.random()*300)+100, deliveries: Math.floor(Math.random()*8)+2 };
        }),
      });
    }
    return request("/api/delivery/earnings/");
  },
};
