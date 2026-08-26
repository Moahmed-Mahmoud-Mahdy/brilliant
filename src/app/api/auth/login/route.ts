import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setCustomerSession, verifyPassword } from "@/lib/auth";
import { mapCustomerDTO } from "@/lib/inventory";
import { ApiError, route } from "@/lib/validators";

export const POST = route(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const customer = await db.customer.findUnique({ where: { phone } });
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    throw new ApiError(401, "بيانات الدخول غير صحيحة");
  }

  await setCustomerSession(customer);
  return NextResponse.json({ customer: mapCustomerDTO(customer) });
});
