import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  PRODUCT_INCLUDE,
  generateSkuCode,
  mapAdminProduct,
} from "@/lib/inventory";
import { logActivity } from "@/lib/notify";
import {
  ApiError,
  asRecord,
  requireAdmin,
  requireNumber,
  requireString,
  route,
} from "@/lib/validators";

// ─── PUT /api/admin/products/[id] — update product + sync color SKUs ───

export const PUT = route(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    const product = await db.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new ApiError(404, "المنتج غير موجود");

    // scalar fields
    const data: {
      name?: string;
      description?: string;
      price?: number;
      salePrice?: number | null;
      categoryId?: string | null;
      images?: string;
      attributes?: string;
      status?: string;
    } = {};

    if (body?.name !== undefined) data.name = requireString(body.name, "اسم المنتج مطلوب");
    if (body?.description !== undefined) {
      data.description = requireString(body.description, "وصف المنتج مطلوب");
    }

    let effectivePrice = product.price;
    if (body?.price !== undefined) {
      const price = requireNumber(body.price, "السعر غير صحيح");
      if (price <= 0) throw new ApiError(400, "السعر يجب أن يكون أكبر من صفر");
      data.price = price;
      effectivePrice = price;
    }

    let effectiveSale = product.salePrice;
    if (body?.salePrice !== undefined) {
      if (body.salePrice === null || body.salePrice === "") {
        data.salePrice = null;
        effectiveSale = null;
      } else {
        const sp = requireNumber(body.salePrice, "سعر العرض غير صحيح");
        if (sp <= 0) throw new ApiError(400, "سعر العرض يجب أن يكون أكبر من صفر");
        data.salePrice = sp;
        effectiveSale = sp;
      }
    }
    if (effectiveSale !== null && effectiveSale !== undefined && effectiveSale >= effectivePrice) {
      throw new ApiError(400, "سعر العرض يجب أن يكون أقل من السعر الأصلي");
    }

    if (body?.categoryId !== undefined) {
      if (body.categoryId === null || body.categoryId === "") {
        data.categoryId = null;
      } else {
        const cat = await db.category.findUnique({
          where: { id: String(body.categoryId) },
        });
        if (!cat) throw new ApiError(400, "القسم غير موجود");
        data.categoryId = cat.id;
      }
    }

    if (body?.images !== undefined) {
      if (!Array.isArray(body.images)) throw new ApiError(400, "قائمة الصور غير صحيحة");
      data.images = JSON.stringify(
        (body.images as unknown[]).filter((i): i is string => typeof i === "string")
      );
    }

    if (body?.attributes !== undefined) {
      if (!Array.isArray(body.attributes)) throw new ApiError(400, "قائمة الخصائص غير صحيحة");
      data.attributes = JSON.stringify(
        (body.attributes as unknown[])
          .map((a) => asRecord(a))
          .filter((a): a is Record<string, unknown> => !!a)
          .map((a) => ({ key: String(a.key ?? ""), value: String(a.value ?? "") }))
      );
    }

    if (body?.status !== undefined) {
      if (body.status !== "ACTIVE" && body.status !== "ARCHIVED") {
        throw new ApiError(400, "حالة المنتج غير صحيحة");
      }
      data.status = body.status;
    }

    await db.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.product.update({ where: { id }, data });
      }

      // 1) remove SKUs (only when nothing is reserved)
      const removedSkuIds: string[] = Array.isArray(body?.removedSkuIds)
        ? (body.removedSkuIds as unknown[]).filter(
            (s): s is string => typeof s === "string"
          )
        : [];
      for (const skuId of removedSkuIds) {
        const fresh = await tx.sku.findUnique({ where: { id: skuId } });
        if (!fresh || fresh.productId !== product.id) continue;
        if (fresh.reservedQty !== 0) {
          throw new ApiError(409, "لا يمكن حذف لون به كمية محجوزة");
        }
        await tx.sku.delete({ where: { id: skuId } });
      }

      // 2) update existing color SKUs
      const skusInput = Array.isArray(body?.skus)
        ? (body.skus as unknown[]).map((s) => asRecord(s)).filter((s): s is Record<string, unknown> => !!s && typeof s.id === "string")
        : [];
      for (const entry of skusInput) {
        const sku = await tx.sku.findUnique({ where: { id: String(entry.id) } });
        if (!sku || sku.productId !== product.id) continue;

        const upd: { colorName?: string; colorHex?: string; lowStockThreshold?: number } = {};
        if (entry.name !== undefined && String(entry.name).trim() !== "") {
          upd.colorName = String(entry.name).trim();
        }
        if (entry.hex !== undefined && entry.hex !== null && entry.hex !== "") {
          upd.colorHex = String(entry.hex);
        }
        if (
          entry.lowStockThreshold !== undefined &&
          entry.lowStockThreshold !== null &&
          entry.lowStockThreshold !== ""
        ) {
          upd.lowStockThreshold = Math.max(0, Math.floor(Number(entry.lowStockThreshold) || 0));
        }

        // optional direct quantity sync (set-to-value)
        const rawQty = entry.quantity;
        if (rawQty !== undefined && rawQty !== null && Number.isFinite(Number(rawQty))) {
          const target = Math.max(0, Math.floor(Number(rawQty)));
          if (target !== sku.availableQty) {
            const diff = target - sku.availableQty;
            await tx.sku.update({
              where: { id: sku.id },
              data: { availableQty: target },
            });
            await tx.inventoryTransaction.create({
              data: {
                skuId: sku.id,
                type: diff > 0 ? "RECEIVE" : "ADJUSTMENT",
                quantity: diff,
                balanceBefore: sku.availableQty,
                balanceAfter: target,
                reason: `تعديل كمية من صفحة المنتج «${product.name}»`,
                adminId: admin.id,
                adminName: admin.name,
              },
            });
          }
        }

        if (Object.keys(upd).length > 0) {
          await tx.sku.update({ where: { id: sku.id }, data: upd });
        }
      }

      // 3) add new color SKUs
      const newColors = Array.isArray(body?.newColors)
        ? (body.newColors as unknown[]).map((c) => asRecord(c)).filter((c): c is Record<string, unknown> => !!c && typeof c.name === "string" && c.name.trim() !== "")
        : [];
      for (const c of newColors) {
        const colorName = String(c.name).trim();
        const colorHex = typeof c.hex === "string" && c.hex ? c.hex : "#CCCCCC";
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
          await tx.sku.update({ where: { id: sku.id }, data: { availableQty: qty } });
          await tx.inventoryTransaction.create({
            data: {
              skuId: sku.id,
              type: "RECEIVE",
              quantity: qty,
              balanceBefore: 0,
              balanceAfter: qty,
              reason: `إضافة لون جديد «${colorName}» للمنتج «${product.name}»`,
              adminId: admin.id,
              adminName: admin.name,
            },
          });
        }
      }
    });

    await logActivity(admin, "PRODUCT_UPDATE", "PRODUCT", id, `تعديل منتج «${product.name}»`);

    const full = await db.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    return NextResponse.json({ product: mapAdminProduct(full!) });
  }
);

// ─── DELETE /api/admin/products/[id] — soft archive ───

export const DELETE = route(
  async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const product = await db.product.findUnique({ where: { id } });
    if (!product) throw new ApiError(404, "المنتج غير موجود");

    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await logActivity(admin, "PRODUCT_ARCHIVE", "PRODUCT", id, `أرشفة منتج «${product.name}»`);
    return NextResponse.json({});
  }
);
