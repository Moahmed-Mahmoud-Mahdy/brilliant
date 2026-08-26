// ─── Shared DTO types used by both frontend and API routes ───

export type OrderStatus =
  | "PENDING_REVIEW"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING_REVIEW",
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
];

export type InventoryTxType =
  | "RECEIVE"
  | "RESERVE"
  | "RELEASE"
  | "SALE"
  | "ADJUSTMENT";

export interface ColorSkuDTO {
  skuId: string;
  name: string;
  hex: string;
  available: number;
  isOut: boolean;
}

export interface ProductListDTO {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  primaryImage: string | null;
  categoryName: string | null;
  hasColors: boolean;
  colors: ColorSkuDTO[];
  totalAvailable: number;
  isOut: boolean; // fully out of stock
  discountPercent: number; // 0 if no sale
  createdAt: string;
}

export interface ProductAttribute {
  key: string;
  value: string;
}

export interface ProductDetailDTO extends ProductListDTO {
  description: string;
  images: string[];
  attributes: ProductAttribute[];
  categoryId: string | null;
  status: "ACTIVE" | "ARCHIVED";
}

export interface CategoryDTO {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  productCount: number;
}

export interface BannerDTO {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
}

export interface ZoneDTO {
  id: string;
  name: string;
  shippingFee: number;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  skuId: string;
  skuCode: string;
  colorName: string | null;
  colorHex: string | null;
  unitPrice: number;
  basePrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  items: OrderItemDTO[];
  subtotal: number;
  discountAmount: number;
  discountCode: string | null;
  shippingFee: number;
  total: number;
  name: string;
  phonePrimary: string;
  phoneSecondary: string;
  whatsappOn: "primary" | "secondary" | "both";
  addressText: string;
  lat: number | null;
  lng: number | null;
  floor: string;
  apartment: string;
  zoneName: string;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface CustomerDTO {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface AdminDTO {
  id: string;
  name: string;
  username: string;
}

export interface CustomerSummaryDTO {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  ordersCount: number;
  deliveredCount: number;
  cancelledCount: number;
  rejectedCount: number;
  totalSpent: number;
}

export interface SkuRowDTO {
  id: string;
  skuCode: string;
  productId: string;
  productName: string;
  productImage: string | null;
  colorName: string | null;
  colorHex: string | null;
  available: number;
  reserved: number;
  sold: number;
  lowStockThreshold: number;
  isLow: boolean;
  isOut: boolean;
}

export interface InventoryTxDTO {
  id: string;
  skuId: string;
  skuCode: string;
  productName: string;
  colorName: string | null;
  type: InventoryTxType;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string | null;
  orderNumber: string | null;
  adminName: string | null;
  createdAt: string;
}

export interface ActivityLogDTO {
  id: string;
  adminName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export interface DashboardDTO {
  ordersByStatus: Record<OrderStatus, number>;
  newOrdersCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  deliveredSalesTotal: number;
  deliveredOrdersCount: number;
  totalProducts: number;
  totalCustomers: number;
  totalSkus: number;
  recentOrders: OrderDTO[];
}

export interface CartItem {
  skuId: string;
  productId: string;
  name: string;
  image: string | null;
  colorName: string | null;
  colorHex: string | null;
  unitPrice: number;
  basePrice: number;
  quantity: number;
  maxQuantity: number;
}

// Admin-side product with full SKU detail
export interface AdminSkuDTO {
  id: string;
  skuCode: string;
  colorName: string | null;
  colorHex: string | null;
  isBase: boolean;
  availableQty: number;
  reservedQty: number;
  soldQty: number;
  lowStockThreshold: number;
}

export interface AdminProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice: number | null;
  images: string[];
  attributes: ProductAttribute[];
  status: "ACTIVE" | "ARCHIVED";
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  skus: AdminSkuDTO[];
}
