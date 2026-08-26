import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { mapAdminDTO } from "@/lib/inventory";
import { route } from "@/lib/validators";

export const GET = route(async () => {
  const admin = await getCurrentAdmin();
  return NextResponse.json({ admin: admin ? mapAdminDTO(admin) : null });
});
