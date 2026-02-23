export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  status: "active" | "inactive";
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  created_at?: string;
}

export interface ProductListResponse {
  page: number;
  limit: number;
  total: number;
  items: Product[];
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: "name" | "price" | "created_at";
  sort_dir?: "asc" | "desc";
}

export interface ProductCreateRequest {
  name: string;
  price: number;
  status?: "active" | "inactive";
  description?: string;
  image_url?: string;
  category?: string;
}

export interface ProductUpdateRequest {
  name?: string;
  price?: number;
  status?: "active" | "inactive";
  description?: string;
  image_url?: string;
  category?: string;
}

export interface CategoriesResponse {
  categories: string[];
}

export type EventType = "view" | "click" | "add_to_cart" | "remove_from_cart" | "checkout_start" | "search";

export interface EventCreateRequest {
  product_id: string;
  type: EventType;
  session_id?: string;
  ts?: string;
  meta?: Record<string, unknown>;
}

export interface AcceptedResponse {
  accepted: boolean;
  id?: string;
}

export interface BulkAcceptedResponse {
  accepted: boolean;
  received: number;
  enqueued: number;
}

export interface Purchase {
  id: string;
  user_id: string;
  product_id: string;
  qty: number;
  amount: number;
  ts: string;
}

export interface PurchaseWithProduct extends Purchase {
  product_name: string;
  product_image_url: string | null;
  product_price: number;
}

export interface PurchaseHistoryResponse {
  page: number;
  limit: number;
  total: number;
  items: PurchaseWithProduct[];
}

export interface TopProductItem {
  product_id: string;
  product_name: string;
  views: number;
  clicks?: number;
  add_to_carts?: number;
  checkout_starts?: number;
  purchases: number;
  revenue: number;
}

export interface TopProductsResponse {
  days: number;
  limit: number;
  items: TopProductItem[];
}

export interface TimeseriesPoint {
  day: string;
  views: number;
  clicks?: number;
  add_to_carts?: number;
  checkout_starts?: number;
  purchases: number;
  revenue: number;
}

export interface ProductTimeseriesResponse {
  product_id: string;
  days: number;
  points: TimeseriesPoint[];
}

export interface UserSummaryResponse {
  days: number;
  views: number;
  purchases: number;
  spend: number;
}

export type ProductSortBy = "views" | "purchases" | "revenue";
export type SortDir = "asc" | "desc";

export interface ProductStatsParams {
  days?: number;
  sort_by?: ProductSortBy;
  sort_dir?: SortDir;
  page?: number;
  limit?: number;
  search?: string;
}

export interface ProductStatsResponse {
  total: number;
  page: number;
  limit: number;
  items: TopProductItem[];
}

export interface OverviewResponse {
  days: number;
  views: number;
  clicks?: number;
  add_to_carts?: number;
  checkout_starts?: number;
  purchases: number;
  revenue: number;
  active_products: number;
  conversion_rate: number;
  changes: {
    views: number;
    clicks?: number;
    add_to_carts?: number;
    checkout_starts?: number;
    purchases: number;
    revenue: number;
  };
}

export interface OverallTimeseriesResponse {
  days: number;
  points: TimeseriesPoint[];
}

export interface HealthResponse {
  status: string;
}

export interface ReadyResponse {
  ready: boolean;
  db: boolean;
  redis: boolean;
}

export interface MetricsResponse {
  uptime_seconds: number;
  node_env: string;
  timestamp: string;
}
