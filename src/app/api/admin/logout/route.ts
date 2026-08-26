import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth";
import { route } from "@/lib/validators";

export const POST = route(async () => {
  await clearAdminSession();
  return NextResponse.json({});
});
