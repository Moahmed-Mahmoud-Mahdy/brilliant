import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { mapAdminDTO } from "@/lib/inventory";
import { ApiError, requireAdmin, route } from "@/lib/validators";

export const PUT = route(async (request: Request) => {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => ({}));

  const data: { name?: string; passwordHash?: string } = {};
  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2) throw new ApiError(400, "الاسم يجب أن يكون حرفين على الأقل");
    data.name = name;
  }
  if (body?.password !== undefined && body?.password !== null && body?.password !== "") {
    const password = String(body.password);
    if (password.length < 6) {
      throw new ApiError(400, "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }
    data.passwordHash = hashPassword(password);
  }

  const updated = await db.admin.update({ where: { id: admin.id }, data });
  return NextResponse.json({ admin: mapAdminDTO(updated) });
});
