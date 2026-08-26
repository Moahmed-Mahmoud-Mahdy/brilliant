import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setAdminSession, verifyPassword } from "@/lib/auth";
import { mapAdminDTO } from "@/lib/inventory";
import { logActivity } from "@/lib/notify";
import { ApiError, route } from "@/lib/validators";

export const POST = route(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const username =
    typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const admin = await db.admin.findUnique({ where: { username } });
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    throw new ApiError(401, "بيانات الدخول غير صحيحة");
  }

  await setAdminSession(admin);
  await logActivity(admin, "ADMIN_LOGIN", "ADMIN", admin.id, `تسجيل دخول ${admin.name}`);
  return NextResponse.json({ admin: mapAdminDTO(admin) });
});
