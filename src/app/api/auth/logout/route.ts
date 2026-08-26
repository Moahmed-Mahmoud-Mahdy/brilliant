import { NextResponse } from "next/server";
import { clearCustomerSession } from "@/lib/auth";
import { route } from "@/lib/validators";

export const POST = route(async () => {
  await clearCustomerSession();
  return NextResponse.json({});
});
