import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { route } from "@/lib/validators";

export const GET = route(async () => {
  const banners = await db.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({
    banners: banners.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      image: b.image,
    })),
  });
});
