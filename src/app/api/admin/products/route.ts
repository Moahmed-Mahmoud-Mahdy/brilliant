import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  PRODUCT_INCLUDE,
  generateSkuCode,
  mapAdminProduct,
} from "@/lib/inventory";
import { logActivity } from "@/lib/notify";
import type { Prisma } from "@prisma/client";
import {
  ApiError,
  asRecord,
  requireAdmin,
  requireNumber,
  requireString,
  route,
} from "@/lib/validators";

// ─── GET /api/admin/products — all products (ACTIVE + ARCHIVED) ───

export const GET = route(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const status = url.searchParams.get("status") || "";

  let products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: PRODUCT_INCLUDE,
  });
  if (search) {
    products = products.filter((p) => p.name.toLowerCase().includes(search));
  }
  if (status === "ACTIVE" || status === "ARCHIVED") {
    products = products.filter((p) => p.status === status);
  }

  return NextResponse.json({ products: products.map(mapAdminProduct) });
});

// ─── POST /api/admin/products — create product + SKUs (+ initial stock) ───

export const POST = route(async (request: Request) => {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => ({}));

  const name = requireString(body?.name, "اسم المنتج مطلوب");
  const description = requireString(body?.description, "وصف المنتج مطلوب");
  const price = requireNumber(body?.price, "السعر غير صحيح");
  if (price <= 0) throw new ApiError(400, "السعر يجب أن يكون أكبر من صفر");

  let salePrice: number | null = null;
  if (body?.salePrice !== undefined && body?.salePrice !== null && body?.salePrice !== "") {
    salePrice = requireNumber(body.salePrice, "سعر العرض غير صحيح");
    if (salePrice <= 0) throw new ApiError(400, "سعر العرض يجب أن يكون أكبر من صفر");
    if (salePrice >= price) {
      throw new ApiError(400, "سعر العرض يجب أن يكون أقل من السعر الأصلي");
    }
  }

  let categoryId: string | null = null;
  if (body?.categoryId) {
    categoryId = String(body.categoryId);
    const cat = await db.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new ApiError(400, "القسم غير موجود");
  }

  const images: string[] = Array.isArray(body?.images)
    ? (body.images as unknown[]).filter((i): i is string => typeof i === "string")
    : [];
  const attributes: { key: string; value: string }[] = Array.isArray(body?.attributes)
    ? (body.attributes as unknown[])
        .map((a) => asRecord(a))
        .filter((a): a is Record<string, unknown> => !!a)
        .map((a) => ({ key: String(a.key ?? ""), value: String(a.value ?? "") }))
    : [];

  const colorSpecs = Array.isArray(body?.colors)
    ? (body.colors as unknown[]).map((c) => asRecord(c)).filter((c): c is Record<string, unknown> => !!c && typeof c.name === "string" && c.name.trim() !== "")
    : [];
  const baseQuantity = Math.max(0, Math.floor(Number(body?.baseQuantity ?? 0) || 0));
  const baseThreshold = Math.max(0, Math.floor(Number(body?.baseLowStockThreshold ?? 3) || 3));

  const receive = async (
    tx: Prisma.TransactionClient,
    skuId: string,
    qty: number,
    label: string
  ) => {
    await tx.sku.update({ where: { id: skuId }, data: { availableQty: qty } });
    await tx.inventoryTransaction.create({
      data: {
        skuId,
        type: "RECEIVE",
        quantity: qty,
        balanceBefore: 0,
        balanceAfter: qty,
        reason: `استلام مخزون أولي — ${label}`,
        adminId: admin.id,
        adminName: admin.name,
      },
    });
  };

  const created = await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name,
        description,
        price,
        salePrice,
        images: JSON.stringify(images),
        attributes: JSON.stringify(attributes),
        status: "ACTIVE",
        categoryId,
      },
    });

    if (colorSpecs.length > 0) {
      for (const c of colorSpecs) {
        const colorName = String(c.name).trim();
        const colorHex =
          typeof c.hex === "string" && c.hex ? c.hex : "#CCCCCC";
        const qty = Math.max(0, Math.floor(Number(c.quantity ?? 0) || 0));
        const threshold = Math.max(0, Math.floor(Number(c.lowStockThreshold ?? 3) || 3));
        const sku = await tx.sku.create({
          data: {
            skuCode: await generateSkuCode(tx),
            productId: product.id,
            colorName,
            colorHex,
            isBase: false,
            availableQty: 0,
            lowStockThreshold: threshold,
          },
        });
        if (qty > 0) {
          await receive(tx, sku.id, qty, `المنتج «${product.name}» — ${colorName}`);
        }
      }
    } else {
      const sku = await tx.sku.create({
        data: {
          skuCode: await generateSkuCode(tx),
          productId: product.id,
          isBase: true,
          availableQty: 0,
          lowStockThreshold: baseThreshold,
        },
      });
      if (baseQuantity > 0) {
        await receive(tx, sku.id, baseQuantity, `المنتج «${product.name}»`);
      }
    }

    return product;
  });

  await logActivity(admin, "PRODUCT_CREATE", "PRODUCT", created.id, `إنشاء منتج «${created.name}»`);

  const full = await db.product.findUnique({
    where: { id: created.id },
    include: PRODUCT_INCLUDE,
  });
  return NextResponse.json({ product: mapAdminProduct(full!) });
});
