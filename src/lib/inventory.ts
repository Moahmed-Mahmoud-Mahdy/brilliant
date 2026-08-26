import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type {
  ActivityLogDTO,
  AdminDTO,
  AdminProductDTO,
  CustomerDTO,
  InventoryTxDTO,
  InventoryTxType,
  NotificationDTO,
  OrderDTO,
  OrderStatus,
  ProductAttribute,
  ProductDetailDTO,
  ProductListDTO,
  SkuRowDTO,
} from "./types";
import { parseJsonArray } from "./validators";

// ─── Shared DTO mappers + inventory helpers (Task 2 — backend) ───

export const ORDER_INCLUDE = {
  items: true,
  zone: true,
  customer: true,
} satisfies Prisma.OrderInclude;

export const PRODUCT_INCLUDE = {
  skus: true,
  category: true,
} satisfies Prisma.ProductInclude;

export type OrderFull = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;
export type ProductFull = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;
export type SkuWithProduct = Prisma.SkuGetPayload<{ include: { product: true } }>;

export function productImages(product: { images: string }): string[] {
  return parseJsonArray<string>(product.images, []);
}

// ─── Customers / admins ───

export function mapCustomerDTO(c: {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
}): CustomerDTO {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    createdAt: c.createdAt.toISOString(),
  };
}

export function mapAdminDTO(a: {
  id: string;
  name: string;
  username: string;
}): AdminDTO {
  return { id: a.id, name: a.name, username: a.username };
}

// ─── Orders ───

export function mapOrder(order: OrderFull): OrderDTO {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    customerName: order.customer.name,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      skuId: item.skuId,
      skuCode: item.skuCode,
      colorName: item.colorName,
      colorHex: item.colorHex,
      unitPrice: item.unitPrice,
      basePrice: item.basePrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    discountCode: order.discountCode,
    shippingFee: order.shippingFee,
    total: order.total,
    name: order.name,
    phonePrimary: order.phonePrimary,
    phoneSecondary: order.phoneSecondary,
    whatsappOn: order.whatsappOn as OrderDTO["whatsappOn"],
    addressText: order.addressText,
    lat: order.lat,
    lng: order.lng,
    floor: order.floor,
    apartment: order.apartment,
    zoneName: order.zone.name,
    rejectionReason: order.rejectionReason,
    cancellationReason: order.cancellationReason,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

// ─── Products ───

export function mapProductList(product: ProductFull): ProductListDTO {
  const images = productImages(product);
  const colorSkus = product.skus.filter((s) => !!s.colorName);
  const totalAvailable = product.skus.reduce((sum, s) => sum + s.availableQty, 0);
  const salePrice = product.salePrice ?? null;
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    salePrice,
    primaryImage: images[0] ?? null,
    categoryName: product.category?.name ?? null,
    hasColors: colorSkus.length > 0,
    // All SKUs are exposed (base SKU included with empty name/hex) so the
    // storefront can add colorless products to the cart — swatches are
    // rendered only when hasColors is true.
    colors: product.skus.map((s) => ({
      skuId: s.id,
      name: s.colorName ?? "",
      hex: s.colorHex ?? "",
      available: s.availableQty,
      isOut: s.availableQty === 0,
    })),
    totalAvailable,
    isOut: totalAvailable === 0,
    discountPercent: salePrice
      ? Math.round((1 - salePrice / product.price) * 100)
      : 0,
    createdAt: product.createdAt.toISOString(),
  };
}

export function mapProductDetail(product: ProductFull): ProductDetailDTO {
  return {
    ...mapProductList(product),
    description: product.description,
    images: productImages(product),
    attributes: parseJsonArray<ProductAttribute>(product.attributes, []),
    categoryId: product.categoryId,
    status: product.status as "ACTIVE" | "ARCHIVED",
  };
}

export function mapAdminProduct(product: ProductFull): AdminProductDTO {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    salePrice: product.salePrice ?? null,
    images: productImages(product),
    attributes: parseJsonArray<ProductAttribute>(product.attributes, []),
    status: product.status as "ACTIVE" | "ARCHIVED",
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    createdAt: product.createdAt.toISOString(),
    skus: product.skus.map((s) => ({
      id: s.id,
      skuCode: s.skuCode,
      colorName: s.colorName,
      colorHex: s.colorHex,
      isBase: s.isBase,
      availableQty: s.availableQty,
      reservedQty: s.reservedQty,
      soldQty: s.soldQty,
      lowStockThreshold: s.lowStockThreshold,
    })),
  };
}

// ─── SKUs / inventory ───

export function mapSkuRow(sku: SkuWithProduct): SkuRowDTO {
  const images = productImages(sku.product);
  return {
    id: sku.id,
    skuCode: sku.skuCode,
    productId: sku.productId,
    productName: sku.product.name,
    productImage: images[0] ?? null,
    colorName: sku.colorName,
    colorHex: sku.colorHex,
    available: sku.availableQty,
    reserved: sku.reservedQty,
    sold: sku.soldQty,
    lowStockThreshold: sku.lowStockThreshold,
    isLow: sku.availableQty > 0 && sku.availableQty <= sku.lowStockThreshold,
    isOut: sku.availableQty === 0,
  };
}

export function mapInventoryTx(
  tx: Prisma.InventoryTransactionGetPayload<{
    include: { sku: { include: { product: true } } };
  }>
): InventoryTxDTO {
  return {
    id: tx.id,
    skuId: tx.skuId,
    skuCode: tx.sku?.skuCode ?? "—",
    productName: tx.sku?.product.name ?? "—",
    colorName: tx.sku?.colorName ?? null,
    type: tx.type as InventoryTxType,
    quantity: tx.quantity,
    balanceBefore: tx.balanceBefore,
    balanceAfter: tx.balanceAfter,
    reason: tx.reason,
    orderNumber: tx.orderId ?? null,
    adminName: tx.adminName,
    createdAt: tx.createdAt.toISOString(),
  };
}

// ─── Notifications / activity ───

export function mapNotification(
  n: Prisma.NotificationGetPayload<Record<string, never>>
): NotificationDTO {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    orderId: n.orderId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

export function mapActivityLog(
  l: Prisma.ActivityLogGetPayload<Record<string, never>>
): ActivityLogDTO {
  return {
    id: l.id,
    adminName: l.adminName,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    details: l.details,
    createdAt: l.createdAt.toISOString(),
  };
}

// ─── SKU code generator: BR-XXXXXX (sequential, collision-safe) ───

type DbLike = Pick<typeof db, "sku">;

export async function generateSkuCode(client: DbLike = db): Promise<string> {
  const skus = await client.sku.findMany({ select: { skuCode: true } });
  let max = 100000;
  const existing = new Set<string>();
  for (const s of skus) {
    existing.add(s.skuCode);
    const m = /^BR-(\d{6,})$/.exec(s.skuCode);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  let candidate = `BR-${String(max + 1).padStart(6, "0")}`;
  while (existing.has(candidate)) {
    candidate = `BR-${String(Math.floor(100000 + Math.random() * 900000))}`;
  }
  return candidate;
}
