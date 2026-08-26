import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { route } from "@/lib/validators";

export const GET = route(async () => {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      image: c.image,
      productCount: c._count.products,
    })),
  });
});
