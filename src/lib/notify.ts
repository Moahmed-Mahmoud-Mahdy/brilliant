import { db } from "./db";

// ─── In-app notifications + admin activity log helpers (Task 2 — backend) ───

export async function notifyCustomer(
  customerId: string,
  type: string,
  title: string,
  message: string,
  orderId?: string | null
) {
  try {
    await db.notification.create({
      data: {
        role: "CUSTOMER",
        customerId,
        type,
        title,
        message,
        orderId: orderId ?? null,
      },
    });
  } catch (err) {
    console.error("[notify] customer notification failed:", err);
  }
}

/** Create one ADMIN notification row per admin (matches seed behaviour) */
export async function notifyAllAdmins(
  type: string,
  title: string,
  message: string,
  orderId?: string | null
) {
  try {
    const admins = await db.admin.findMany({ select: { id: true } });
    if (admins.length === 0) {
      await db.notification.create({
        data: { role: "ADMIN", type, title, message, orderId: orderId ?? null },
      });
      return;
    }
    await db.notification.createMany({
      data: admins.map(() => ({
        role: "ADMIN" as const,
        type,
        title,
        message,
        orderId: orderId ?? null,
      })),
    });
  } catch (err) {
    console.error("[notify] admin notification failed:", err);
  }
}

export async function logActivity(
  admin: { id: string; name: string } | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  summary?: string
) {
  try {
    await db.activityLog.create({
      data: {
        adminId: admin?.id ?? null,
        adminName: admin?.name ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        details: JSON.stringify({ summary: summary ?? "" }),
      },
    });
  } catch (err) {
    console.error("[notify] activity log failed:", err);
  }
}
