import type { InventoryTxType, OrderStatus } from "./types";

// Store contact numbers (Phone & WhatsApp)
export const WHATSAPP_NUMBER = "201559562033";
export const STORE_PHONE = "01559562033";

export const CURRENCY = "ج.م";

export function formatPrice(value: number): string {
  return `${value.toLocaleString("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${CURRENCY}`;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_REVIEW: "بانتظار المراجعة",
  CONFIRMED: "تم التأكيد",
  OUT_FOR_DELIVERY: "جاري التوصيل",
  DELIVERED: "تم التسليم",
  REJECTED: "مرفوض",
  CANCELLED: "ملغي",
};

export const INVENTORY_TX_LABELS: Record<InventoryTxType, string> = {
  RECEIVE: "إضافة مخزون",
  RESERVE: "حجز",
  RELEASE: "تحرير حجز",
  SALE: "بيع",
  ADJUSTMENT: "تعديل يدوي",
};

export const ACTION_LABELS: Record<string, string> = {
  PRODUCT_CREATE: "إنشاء منتج",
  PRODUCT_UPDATE: "تعديل منتج",
  PRODUCT_ARCHIVE: "أرشفة منتج",
  PRODUCT_RESTORE: "استعادة منتج",
  CATEGORY_CREATE: "إنشاء قسم",
  CATEGORY_UPDATE: "تعديل قسم",
  CATEGORY_ARCHIVE: "أرشفة قسم",
  ORDER_CONFIRM: "تأكيد طلب",
  ORDER_REJECT: "رفض طلب",
  ORDER_CANCEL: "إلغاء طلب",
  ORDER_STATUS: "تحديث حالة طلب",
  STOCK_ADJUST: "تعديل مخزون",
  STOCK_RECEIVE: "إضافة مخزون",
  ZONE_CREATE: "إنشاء منطقة",
  ZONE_UPDATE: "تعديل منطقة",
  BANNER_CREATE: "إنشاء بانر",
  BANNER_UPDATE: "تعديل بانر",
  BANNER_DELETE: "حذف بانر",
  DISCOUNT_CREATE: "إنشاء كود خصم",
  DISCOUNT_UPDATE: "تعديل كود خصم",
  DISCOUNT_DELETE: "حذف كود خصم",
  ADMIN_LOGIN: "تسجيل دخول أدمن",
  CUSTOMER_NOTE: "ملاحظة على عميل",
};

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function generateOrderNumber(): string {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BR-${y}${m}${day}-${rand}`;
}
