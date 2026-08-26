import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { route } from "@/lib/validators";

export const GET = route(async () => {
  const zones = await db.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      shippingFee: z.shippingFee,
    })),
  });
});
