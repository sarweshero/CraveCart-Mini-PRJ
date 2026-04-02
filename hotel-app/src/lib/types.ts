export interface Hotel {
  id: string;
  owner_name: string;
  email: string;
  restaurant_name: string;
  avatar?: string;
  is_profile_complete?: boolean;
  role?: "hotel_admin";
  is_open?: boolean;
}

export interface HotelAuthState {
  hotel: Hotel | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (hotel: Hotel, token: string) => void;
  clearAuth: () => void;
  updateHotel: (data: Partial<Hotel>) => void;
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface HotelOrder {
  id: string;
  customer: { name: string; phone: string; avatar: string };
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  placed_at: string;
  delivery_address: string;
}

export interface AITemplate {
  id: string;
  name: string;
  description?: string;
  tone?: string;
  is_active?: boolean;
  prompt_instructions?: string;
  example_response?: string;
  text?: string;
  generated_at?: string;
  template_used?: string;
  email_sent?: boolean;
  created_at?: string;
  last_used?: string;
  usage_count?: number;
}

export interface HotelReview {
  id: string;
  order_id: string;
  customer: { name: string; email: string; avatar: string };
  rating: number;
  comment: string;
  created_at: string;
  ai_response: {
    id: string;
    text: string;
    generated_at: string;
    email_sent: boolean;
    template_used?: string;
  } | null;
}

export interface ReviewsResponse {
  count: number;
  results: HotelReview[];
}

export interface DashboardStats {
  today: { orders: number; revenue: number; avg_order_value: number; new_reviews: number };
  this_week: { orders: number; revenue: number; avg_order_value: number; reviews: number };
  this_month: { orders: number; revenue: number; avg_order_value: number; reviews: number };
  rating_overview: { average: number; total: number; breakdown: Record<string, number> };
  recent_orders: Array<{
    id: string;
    customer_name: string;
    items: string[];
    total: number;
    status: OrderStatus;
    placed_at: string;
  }>;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number | null;
  image?: string;
  is_available: boolean;
  is_veg?: boolean;
  is_bestseller?: boolean;
  spice_level?: "mild" | "medium" | "hot" | "extra-hot" | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  items: MenuItem[];
}
