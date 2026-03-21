// ============================================================
// CraveCart Customer App — TypeScript Type Definitions
// ============================================================

// --- Auth ---
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatar: string;
  is_profile_complete: boolean;
  role: "customer" | "hotel_admin";
  addresses: Address[];
  created_at: string;
}

export interface AuthTokens {
  token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirm_password: string;
}

export interface CompleteProfilePayload {
  name: string;
  phone: string;
  address?: Omit<Address, "id">;
}

// --- Address ---
export interface Address {
  id: string;
  label: "Home" | "Work" | "Other";
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

// --- Restaurant ---
export interface Discount {
  type: "percentage" | "flat";
  value: number;
  label: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  cuisine_tags: string[];
  thumbnail: string;
  cover_image: string;
  rating: number;
  total_reviews: number;
  avg_delivery_time: number;
  min_order: number;
  delivery_fee: number;
  is_open: boolean;
  is_featured: boolean;
  discount: Discount | null;
  location: {
    city: string;
    area: string;
  };
  timings?: string;
  phone?: string;
  address?: string;
  fssai?: string;
}

// --- Menu ---
export interface MenuCustomization {
  name: string;
  price: number;
}

export type SpiceLevel = "mild" | "medium" | "hot" | "extra-hot" | null;

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  image: string;
  is_veg: boolean;
  is_bestseller: boolean;
  is_available: boolean;
  spice_level: SpiceLevel;
  customizations: MenuCustomization[];
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  items: MenuItem[];
}

export interface RestaurantDetail extends Restaurant {
  menu_categories: MenuCategory[];
}

// --- Cart ---
export interface CartItem {
  id: string;
  menu_item: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
  quantity: number;
  customizations: string[];
  item_total: number;
}

export interface AppliedCoupon {
  code: string;
  type: "percentage" | "flat";
  value: number;
  max_discount?: number;
}

export interface Cart {
  id: string;
  restaurant: {
    id: string;
    name: string;
  };
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  discount: number;
  taxes: number;
  total: number;
  applied_coupon: AppliedCoupon | null;
}

// --- Orders ---
export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface TrackingStep {
  status: OrderStatus;
  label: string;
  description: string;
  time: string;
  completed: boolean;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  customizations: string[];
  item_total: number;
}

export interface AIResponse {
  id: string;
  text: string;
  generated_at: string;
  email_sent: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  ai_response: AIResponse | null;
}

export interface Order {
  id: string;
  restaurant: {
    id: string;
    name: string;
    thumbnail: string;
    phone?: string;
    address?: string;
  };
  status: OrderStatus;
  items_count: number;
  total: number;
  placed_at: string;
  delivered_at: string | null;
  has_review: boolean;
}

export interface OrderDetail extends Omit<Order, "items_count" | "has_review"> {
  tracking: TrackingStep[];
  items: OrderItem[];
  delivery_address: Omit<Address, "id" | "is_default">;
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  discount: number;
  taxes: number;
  payment_method: string;
  payment_status: "paid" | "pending" | "failed";
  review: Review | null;
}

// --- Review ---
export interface ReviewPayload {
  order_id: string;
  rating: number;
  comment: string;
}

// --- Coupon ---
export interface Coupon {
  code: string;
  description: string;
  type: "percentage" | "flat";
  value: number;
  max_discount?: number;
  min_order: number;
  expires_at: string;
}

// --- Category ---
export interface FoodCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// --- Pagination ---
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- API ---
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status_code?: number;
}

// --- Store ---
export interface CartStore {
  items: (CartItem & { restaurantId: string; restaurantName: string })[];
  restaurantId: string | null;
  restaurantName: string | null;
  addItem: (item: CartItem, restaurantId: string, restaurantName: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

// --- Filters ---
export interface RestaurantFilters {
  search?: string;
  cuisine?: string;
  sort_by?: "rating" | "delivery_time" | "min_order" | "popularity";
  is_veg?: boolean;
  is_open?: boolean;
  max_delivery_time?: number;
}
