import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, setCustomerSession } from "@/lib/auth";
import { mapCustomerDTO } from "@/lib/inventory";
import { ApiError, EGYPT_PHONE_RE, route } from "@/lib/validators";

export const POST = route(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (name.length < 2) {
    throw new ApiError(400, "الاسم يجب أن يكون حرفين على الأقل");
  }
  if (!EGYPT_PHONE_RE.test(phone)) {
    throw new ApiError(400, "رقم الهاتف غير صحيح — مثال: 01012345678");
  }
  if (password.length < 6) {
    throw new ApiError(400, "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }

  const existing = await db.customer.findUnique({ where: { phone } });
  if (existing) {
    throw new ApiError(409, "رقم الهاتف مسجل بالفعل");
  }

  const customer = await db.customer.create({
    data: { name, phone, passwordHash: hashPassword(password) },
  });
  await setCustomerSession(customer);

  return NextResponse.json({ customer: mapCustomerDTO(customer) });
});
