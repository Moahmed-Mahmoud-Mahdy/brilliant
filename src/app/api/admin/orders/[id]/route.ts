import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ORDER_INCLUDE, mapOrder } from "@/lib/inventory";
import { logActivity, notifyAllAdmins, notifyCustomer } from "@/lib/notify";
import { ApiError, requireAdmin, route } from "@/lib/validators";

// ─── GET /api/admin/orders/[id] — order + customer history ───

export const GET = route(
  async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await ctx.params;
    const order = await db.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new ApiError(404, "الطلب غير موجود");

    const customerOrders = await db.order.findMany({
      where: { customerId: order.customerId },
      select: { status: true },
    });
    const customerHistory = {
      ordersCount: customerOrders.length,
      deliveredCount: customerOrders.filter((o) => o.status === "DELIVERED").length,
      cancelledCount: customerOrders.filter((o) => o.status === "CANCELLED").length,
      rejectedCount: customerOrders.filter((o) => o.status === "REJECTED").length,
    };

    return NextResponse.json({ order: mapOrder(order), customerHistory });
  }
);

// ─── PUT /api/admin/orders/[id] — lifecycle transitions + inventory ops ───

export const PUT = route(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new ApiError(404, "الطلب غير موجود");

    const badTransition = () =>
      new ApiError(400, "لا يمكن تنفيذ هذا الإجراء في حالة الطلب الحالية");

    if (action === "confirm") {
      if (order.status !== "PENDING_REVIEW") throw badTransition();
      await db.$transaction(async (tx) => {
        for (const item of order.items) {
          const sku = await tx.sku.findUnique({ where: { id: item.skuId } });
          if (!sku) {
            throw new ApiError(409, `المنتج «${item.productName}» لم يعد موجوداً في المخزون`);
          }
          if (sku.availableQty < item.quantity) {
            const colorTxt = item.colorName ? ` (اللون ${item.colorName})` : "";
            throw new ApiError(
              409,
              `المخزون غير كافٍ للمنتج «${item.productName}»${colorTxt} — المتبقي ${sku.availableQty}`
            );
          }
          await tx.sku.update({
            where: { id: sku.id },
            data: {
              availableQty: sku.availableQty - item.quantity,
              reservedQty: sku.reservedQty + item.quantity,
            },
          });
          await tx.inventoryTransaction.create({
            data: {
              skuId: sku.id,
              type: "RESERVE",
              quantity: -item.quantity,
              balanceBefore: sku.availableQty,
              balanceAfter: sku.availableQty - item.quantity,
              reason: `حجز كمية للطلب ${order.orderNumber}`,
              orderId: order.orderNumber,
              adminId: admin.id,
              adminName: admin.name,
            },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CONFIRMED" },
        });
      });
      await notifyCustomer(
        order.customerId,
        "ORDER_STATUS",
        "تم تأكيد طلبك",
        `تم تأكيد طلبك رقم ${order.orderNumber} وسيتم التواصل معك قريباً لتحديد تفاصيل التوصيل.`,
        order.id
      );
      await logActivity(admin, "ORDER_CONFIRM", "ORDER", order.id, `تأكيد الطلب ${order.orderNumber} وحجز المخزون`);
    } else if (action === "reject") {
      if (order.status !== "PENDING_REVIEW") throw badTransition();
      if (!reason) throw new ApiError(400, "سبب الرفض إجباري");
      await db.order.update({
        where: { id: order.id },
        data: { status: "REJECTED", rejectionReason: reason },
      });
      await notifyCustomer(
        order.customerId,
        "ORDER_STATUS",
        "تم رفض طلبك",
        `نأسف، تم رفض طلبك رقم ${order.orderNumber}. السبب: ${reason}`,
        order.id
      );
      await logActivity(admin, "ORDER_REJECT", "ORDER", order.id, `رفض الطلب ${order.orderNumber} — السبب: ${reason}`);
    } else if (action === "out_for_delivery") {
      if (order.status !== "CONFIRMED") throw badTransition();
      await db.order.update({
        where: { id: order.id },
        data: { status: "OUT_FOR_DELIVERY" },
      });
      await notifyCustomer(
        order.customerId,
        "ORDER_STATUS",
        "طلبك في الطريق إليك",
        `طلبك رقم ${order.orderNumber} في الطريق إليك الآن.`,
        order.id
      );
      await logActivity(admin, "ORDER_STATUS", "ORDER", order.id, `تحديث حالة الطلب ${order.orderNumber} إلى جاري التوصيل`);
    } else if (action === "deliver") {
      if (order.status !== "OUT_FOR_DELIVERY") throw badTransition();
      await db.$transaction(async (tx) => {
        for (const item of order.items) {
          const sku = await tx.sku.findUnique({ where: { id: item.skuId } });
          if (!sku) continue; // SKU deleted after confirmation — keep history
          await tx.sku.update({
            where: { id: sku.id },
            data: {
              reservedQty: Math.max(0, sku.reservedQty - item.quantity),
              soldQty: sku.soldQty + item.quantity,
            },
          });
          await tx.inventoryTransaction.create({
            data: {
              skuId: sku.id,
              type: "SALE",
              quantity: -item.quantity,
              balanceBefore: sku.availableQty,
              balanceAfter: sku.availableQty,
              reason: `تسليم الطلب ${order.orderNumber} — تحويل الحجز إلى مبيعات`,
              orderId: order.orderNumber,
              adminId: admin.id,
              adminName: admin.name,
            },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: { status: "DELIVERED" },
        });
      });
      await notifyCustomer(
        order.customerId,
        "ORDER_STATUS",
        "تم تسليم طلبك",
        `تم تسليم طلبك رقم ${order.orderNumber} بنجاح. نتمنى أن ينال إعجابك!`,
        order.id
      );
      await logActivity(admin, "ORDER_STATUS", "ORDER", order.id, `تحديث حالة الطلب ${order.orderNumber} إلى تم التسليم`);
    } else if (action === "cancel") {
      if (
        order.status !== "PENDING_REVIEW" &&
        order.status !== "CONFIRMED" &&
        order.status !== "OUT_FOR_DELIVERY"
      ) {
        throw badTransition();
      }
      const mustRelease =
        order.status === "CONFIRMED" || order.status === "OUT_FOR_DELIVERY";
      if (mustRelease) {
        await db.$transaction(async (tx) => {
          for (const item of order.items) {
            const sku = await tx.sku.findUnique({ where: { id: item.skuId } });
            if (!sku) continue;
            await tx.sku.update({
              where: { id: sku.id },
              data: {
                availableQty: sku.availableQty + item.quantity,
                reservedQty: Math.max(0, sku.reservedQty - item.quantity),
              },
            });
            await tx.inventoryTransaction.create({
              data: {
                skuId: sku.id,
                type: "RELEASE",
                quantity: item.quantity,
                balanceBefore: sku.availableQty,
                balanceAfter: sku.availableQty + item.quantity,
                reason: `إلغاء الطلب ${order.orderNumber} — تحرير الكمية المحجوزة`,
                orderId: order.orderNumber,
                adminId: admin.id,
                adminName: admin.name,
              },
            });
          }
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              cancellationReason: reason || null,
            },
          });
        });
      } else {
        await db.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            cancellationReason: reason || null,
          },
        });
      }
      await notifyCustomer(
        order.customerId,
        "ORDER_STATUS",
        "تم إلغاء طلبك",
        `تم إلغاء طلبك رقم ${order.orderNumber}${reason ? ` — السبب: ${reason}` : ""}.`,
        order.id
      );
      await notifyAllAdmins(
        "ORDER_STATUS",
        "إشعار بإلغاء الطلب",
        `تم إلغاء الطلب رقم ${order.orderNumber}.`,
        order.id
      );
      await logActivity(
        admin,
        "ORDER_CANCEL",
        "ORDER",
        order.id,
        `إلغاء الطلب ${order.orderNumber}${reason ? ` — السبب: ${reason}` : ""}`
      );
    } else {
      throw new ApiError(400, "إجراء غير معروف");
    }

    const updated = await db.order.findUnique({
      where: { id: order.id },
      include: ORDER_INCLUDE,
    });
    return NextResponse.json({ order: mapOrder(updated!) });
  }
);
