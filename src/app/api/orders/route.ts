import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/constants";
import {
  ORDER_INCLUDE,
  mapOrder,
  productImages,
} from "@/lib/inventory";
import { notifyAllAdmins, notifyCustomer } from "@/lib/notify";
import {
  ApiError,
  EGYPT_PHONE_RE,
  asRecord,
  optionalNumberOrNull,
  requireString,
  round2,
  route,
  requireCustomer,
} from "@/lib/validators";

// ─── POST /api/orders — place a new order (PENDING_REVIEW, no reservation yet) ───

export const POST = route(async (request: Request) => {
  const customer = await requireCustomer();
  const body = await request.json().catch(() => ({}));

  // items
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0) {
    throw new ApiError(400, "السلة فارغة — أضف منتجات إلى الطلب أولاً");
  }
  const quantities = new Map<string, number>();
  for (const raw of rawItems) {
    const rec = asRecord(raw);
    const skuId = typeof rec?.skuId === "string" ? rec.skuId : "";
    const qty = Number(rec?.quantity);
    if (!skuId) throw new ApiError(400, "عنصر غير صحيح في السلة");
    if (!Number.isInteger(qty) || qty < 1) {
      throw new ApiError(400, "الكمية غير صحيحة");
    }
    quantities.set(skuId, (quantities.get(skuId) ?? 0) + qty);
  }

  const skus = await db.sku.findMany({
    where: { id: { in: [...quantities.keys()] } },
    include: { product: true },
  });
  const skuMap = new Map(skus.map((s) => [s.id, s]));

  const lines: {
    sku: (typeof skus)[number];
    quantity: number;
    unitPrice: number;
    basePrice: number;
    lineTotal: number;
  }[] = [];
  for (const [skuId, qty] of quantities) {
    const sku = skuMap.get(skuId);
    if (!sku) {
      throw new ApiError(409, "أحد المنتجات في سلتك لم يعد متاحاً");
    }
    if (sku.product.status !== "ACTIVE") {
      throw new ApiError(409, `المنتج «${sku.product.name}» غير متاح حالياً`);
    }
    if (sku.availableQty < qty) {
      const colorTxt = sku.colorName ? ` (اللون ${sku.colorName})` : "";
      throw new ApiError(
        409,
        `المخزون غير كافٍ للمنتج «${sku.product.name}»${colorTxt} — المتاح ${sku.availableQty} فقط`
      );
    }
    const unitPrice = round2(sku.product.salePrice ?? sku.product.price);
    lines.push({
      sku,
      quantity: qty,
      unitPrice,
      basePrice: sku.product.price,
      lineTotal: round2(unitPrice * qty),
    });
  }

  // delivery info
  const name = requireString(body?.name, "الاسم مطلوب");
  const phonePrimary = requireString(
    body?.phonePrimary,
    "رقم الهاتف الأساسي مطلوب"
  );
  if (!EGYPT_PHONE_RE.test(phonePrimary)) {
    throw new ApiError(400, "رقم الهاتف الأساسي غير صحيح");
  }
  const phoneSecondary =
    typeof body?.phoneSecondary === "string" ? body.phoneSecondary.trim() : "";
  if (phoneSecondary && !EGYPT_PHONE_RE.test(phoneSecondary)) {
    throw new ApiError(400, "رقم الهاتف الثانوي غير صحيح");
  }
  const whatsappOn = body?.whatsappOn;
  if (whatsappOn !== "primary" && whatsappOn !== "secondary" && whatsappOn !== "both") {
    throw new ApiError(400, "اختر رقم الواتساب المفضل للتواصل");
  }
  const addressText = requireString(body?.addressText, "العنوان مطلوب");
  const floor = requireString(body?.floor, "الطابق مطلوب");
  const apartment = requireString(body?.apartment, "الشقة مطلوبة");
  const zoneId = requireString(body?.zoneId, "منطقة التوصيل مطلوبة");
  const zone = await db.deliveryZone.findUnique({ where: { id: zoneId } });
  if (!zone || !zone.isActive) {
    throw new ApiError(400, "منطقة التوصيل غير متاحة");
  }
  const lat = optionalNumberOrNull(body?.lat);
  const lng = optionalNumberOrNull(body?.lng);

  // totals
  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));

  let discountAmount = 0;
  let discountCode: string | null = null;
  const rawCode =
    typeof body?.discountCode === "string" ? body.discountCode.trim().toUpperCase() : "";
  if (rawCode) {
    const dc = await db.discountCode.findUnique({ where: { code: rawCode } });
    if (!dc) throw new ApiError(400, "كود الخصم غير موجود");
    if (dc.expiresAt && dc.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(400, "انتهت صلاحية كود الخصم");
    }
    if (!dc.isActive) throw new ApiError(400, "كود الخصم غير مفعّل");
    discountCode = dc.code;
    discountAmount = round2((subtotal * dc.percentage) / 100);
  }

  const shippingFee = zone.shippingFee;
  const total = round2(subtotal - discountAmount + shippingFee);

  // unique order number
  let orderNumber = generateOrderNumber();
  for (let i = 0; i < 10; i++) {
    const clash = await db.order.findUnique({ where: { orderNumber } });
    if (!clash) break;
    orderNumber = generateOrderNumber();
  }

  const order = await db.order.create({
    data: {
      orderNumber,
      customerId: customer.id,
      status: "PENDING_REVIEW",
      name,
      phonePrimary,
      phoneSecondary,
      whatsappOn,
      addressText,
      lat,
      lng,
      floor,
      apartment,
      zoneId: zone.id,
      subtotal,
      discountAmount,
      discountCode,
      shippingFee,
      total,
      items: {
        create: lines.map((l) => ({
          productId: l.sku.productId,
          productName: l.sku.product.name,
          productImage: productImages(l.sku.product)[0] ?? null,
          skuId: l.sku.id,
          skuCode: l.sku.skuCode,
          colorName: l.sku.colorName,
          colorHex: l.sku.colorHex,
          unitPrice: l.unitPrice,
          basePrice: l.basePrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })),
      },
    },
  });

  await notifyAllAdmins(
    "NEW_ORDER",
    "طلب جديد بانتظار المراجعة",
    `طلب جديد رقم ${orderNumber} من ${customer.name} بقيمة ${total} ج.م بانتظار المراجعة.`,
    order.id
  );
  await notifyCustomer(
    customer.id,
    "ORDER_STATUS",
    "استلمنا طلبك",
    `استلمنا طلبك رقم ${orderNumber} وسيتم مراجعته والتواصل معك قريباً.`,
    order.id
  );

  const full = await db.order.findUnique({
    where: { id: order.id },
    include: ORDER_INCLUDE,
  });
  return NextResponse.json({ order: mapOrder(full!) });
});

// ─── GET /api/orders — my orders ───

export const GET = route(async () => {
  const customer = await requireCustomer();
  const orders = await db.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: ORDER_INCLUDE,
  });
  return NextResponse.json({ orders: orders.map(mapOrder) });
});
