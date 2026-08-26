import type {
  ActivityLogDTO,
  AdminProductDTO,
  BannerDTO,
  CategoryDTO,
  CustomerSummaryDTO,
  DashboardDTO,
  InventoryTxDTO,
  NotificationDTO,
  OrderDTO,
  ProductDetailDTO,
  ProductListDTO,
  SkuRowDTO,
  ZoneDTO,
  CustomerDTO,
  AdminDTO,
  CartItem,
} from "./types";

// ─── Typed fetch helpers for the BRILLIANT API ───

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || "حدث خطأ غير متوقع، حاول مرة أخرى"
    );
  }
  return data as T;
}

const get = <T>(url: string) => request<T>(url);
const post = <T>(url: string, body?: unknown) =>
  request<T>(url, {
    method: "POST",
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
const put = <T>(url: string, body?: unknown) =>
  request<T>(url, {
    method: "PUT",
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
const del = <T>(url: string) => request<T>(url, { method: "DELETE" });

// ─── Auth ───

export const api = {
  auth: {
    register: (body: { name: string; phone: string; password: string }) =>
      post<{ customer: CustomerDTO }>("/api/auth/register", body),
    login: (body: { phone: string; password: string }) =>
      post<{ customer: CustomerDTO }>("/api/auth/login", body),
    logout: () => post<Record<string, never>>("/api/auth/logout"),
    me: () => get<{ customer: CustomerDTO | null }>("/api/auth/me"),
  },
  admin: {
    login: (body: { username: string; password: string }) =>
      post<{ admin: AdminDTO }>("/api/admin/login", body),
    logout: () => post<Record<string, never>>("/api/admin/logout"),
    me: () => get<{ admin: AdminDTO | null }>("/api/admin/me"),
    dashboard: () => get<{ dashboard: DashboardDTO }>("/api/admin/dashboard"),
    orders: (params?: { status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.search) q.set("search", params.search);
      return get<{ orders: OrderDTO[] }>(
        `/api/admin/orders${q.toString() ? `?${q}` : ""}`
      );
    },
    order: (id: string) => get<{ order: OrderDTO; customerHistory: { ordersCount: number; deliveredCount: number; cancelledCount: number; rejectedCount: number } }>(`/api/admin/orders/${id}`),
    updateOrder: (
      id: string,
      body: {
        action: "confirm" | "reject" | "out_for_delivery" | "deliver" | "cancel";
        reason?: string;
      }
    ) => put<{ order: OrderDTO }>(`/api/admin/orders/${id}`, body),
    products: (params?: { search?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.status) q.set("status", params.status);
      return get<{ products: AdminProductDTO[] }>(
        `/api/admin/products${q.toString() ? `?${q}` : ""}`
      );
    },
    createProduct: (body: Record<string, unknown>) =>
      post<{ product: AdminProductDTO }>("/api/admin/products", body),
    updateProduct: (id: string, body: Record<string, unknown>) =>
      put<{ product: AdminProductDTO }>(`/api/admin/products/${id}`, body),
    deleteProduct: (id: string) => del<Record<string, never>>(`/api/admin/products/${id}`),
    categories: () => get<{ categories: (CategoryDTO & { isActive: boolean })[] }>("/api/admin/categories"),
    createCategory: (body: Record<string, unknown>) =>
      post<{ category: CategoryDTO }>("/api/admin/categories", body),
    updateCategory: (id: string, body: Record<string, unknown>) =>
      put<{ category: CategoryDTO }>(`/api/admin/categories/${id}`, body),
    deleteCategory: (id: string) => del<Record<string, never>>(`/api/admin/categories/${id}`),
    customers: (params?: { search?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      return get<{ customers: CustomerSummaryDTO[] }>(
        `/api/admin/customers${q.toString() ? `?${q}` : ""}`
      );
    },
    zones: () => get<{ zones: (ZoneDTO & { isActive: boolean })[] }>("/api/admin/zones"),
    createZone: (body: Record<string, unknown>) =>
      post<{ zone: ZoneDTO }>("/api/admin/zones", body),
    updateZone: (id: string, body: Record<string, unknown>) =>
      put<{ zone: ZoneDTO }>(`/api/admin/zones/${id}`, body),
    deleteZone: (id: string) => del<Record<string, never>>(`/api/admin/zones/${id}`),
    discountCodes: () =>
      get<{
        codes: {
          id: string;
          code: string;
          percentage: number;
          expiresAt: string | null;
          isActive: boolean;
        }[];
      }>("/api/admin/discount-codes"),
    createDiscountCode: (body: Record<string, unknown>) =>
      post<{ code: Record<string, unknown> }>("/api/admin/discount-codes", body),
    updateDiscountCode: (id: string, body: Record<string, unknown>) =>
      put<{ code: Record<string, unknown> }>(`/api/admin/discount-codes/${id}`, body),
    deleteDiscountCode: (id: string) => del<Record<string, never>>(`/api/admin/discount-codes/${id}`),
    banners: () =>
      get<{ banners: (BannerDTO & { isActive: boolean; sortOrder: number })[] }>("/api/admin/banners"),
    createBanner: (body: Record<string, unknown>) =>
      post<{ banner: BannerDTO }>("/api/admin/banners", body),
    updateBanner: (id: string, body: Record<string, unknown>) =>
      put<{ banner: BannerDTO }>(`/api/admin/banners/${id}`, body),
    deleteBanner: (id: string) => del<Record<string, never>>(`/api/admin/banners/${id}`),
    inventory: (params?: { lowStock?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.lowStock) q.set("lowStock", "true");
      return get<{ skus: SkuRowDTO[] }>(
        `/api/admin/inventory${q.toString() ? `?${q}` : ""}`
      );
    },
    adjustInventory: (body: {
      skuId: string;
      type: "RECEIVE" | "ADJUSTMENT";
      quantity: number;
      reason: string;
    }) => post<{ sku: SkuRowDTO }>("/api/admin/inventory/adjust", body),
    transactions: (params?: { skuId?: string }) => {
      const q = new URLSearchParams();
      if (params?.skuId) q.set("skuId", params.skuId);
      return get<{ transactions: InventoryTxDTO[] }>(
        `/api/admin/inventory/transactions${q.toString() ? `?${q}` : ""}`
      );
    },
    activityLog: () => get<{ logs: ActivityLogDTO[] }>("/api/admin/activity-log"),
    notifications: () =>
      get<{ notifications: NotificationDTO[] }>("/api/admin/notifications"),
    readNotifications: () => post<Record<string, never>>("/api/admin/notifications/read"),
    updateProfile: (body: { name?: string; password?: string }) =>
      put<{ admin: AdminDTO }>("/api/admin/profile", body),
    upload: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return post<{ url: string }>("/api/upload", fd);
    },
  },

  categories: () => get<{ categories: CategoryDTO[] }>("/api/categories"),
  products: (params?: {
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    availability?: "all" | "in_stock" | "out_of_stock";
    sort?: "newest" | "price_asc" | "price_desc";
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.categoryId) q.set("categoryId", params.categoryId);
    if (params?.minPrice !== undefined) q.set("minPrice", String(params.minPrice));
    if (params?.maxPrice !== undefined) q.set("maxPrice", String(params.maxPrice));
    if (params?.availability && params.availability !== "all")
      q.set("availability", params.availability);
    if (params?.sort) q.set("sort", params.sort);
    return get<{ products: ProductListDTO[] }>(
      `/api/products${q.toString() ? `?${q}` : ""}`
    );
  },
  product: (id: string) => get<{ product: ProductDetailDTO }>(`/api/products/${id}`),
  banners: () => get<{ banners: BannerDTO[] }>("/api/banners"),
  zones: () => get<{ zones: ZoneDTO[] }>("/api/zones"),
  validateDiscount: (body: { code: string; subtotal: number }) =>
    post<{
      valid: boolean;
      discountAmount: number;
      percentage: number;
      code: string;
      error?: string;
    }>("/api/discount-codes/validate", body),
  orders: {
    create: (body: {
      items: { skuId: string; quantity: number }[];
      name: string;
      phonePrimary: string;
      phoneSecondary: string;
      whatsappOn: "primary" | "secondary" | "both";
      addressText: string;
      lat?: number;
      lng?: number;
      floor: string;
      apartment: string;
      zoneId: string;
      discountCode?: string;
    }) => post<{ order: OrderDTO }>("/api/orders", body),
    list: () => get<{ orders: OrderDTO[] }>("/api/orders"),
    get: (id: string) => get<{ order: OrderDTO }>(`/api/orders/${id}`),
    reorder: (id: string) =>
      post<{
        added: { skuId: string; quantity: number }[];
        unavailable: { productName: string; colorName: string | null }[];
        cartItems: CartItem[];
      }>(`/api/orders/${id}/reorder`),
  },
  notifications: () => get<{ notifications: NotificationDTO[] }>("/api/notifications"),
  readNotifications: () => post<Record<string, never>>("/api/notifications/read"),
};
