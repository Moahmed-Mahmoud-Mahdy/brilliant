import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/notify";
import {
  ApiError,
  optionalString,
  requireAdmin,
  requireString,
  route,
} from "@/lib/validators";

// ─── GET /api/admin/categories — all, with product counts (any status) ───

export const GET = route(async () => {
  await requireAdmin();
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      image: c.image,
      productCount: c._count.products,
      isActive: c.isActive,
    })),
  });
});

// ─── POST /api/admin/categories ───

export const POST = route(async (request: Request) => {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => ({}));

  const name = requireString(body?.name, "اسم القسم مطلوب");
  const description = optionalString(body?.description) || null;
  const image = optionalString(body?.image) || null;
  const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);

  const last = await db.category.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const category = await db.category.create({
    data: {
      name,
      description,
      image,
      isActive,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  await logActivity(admin, "CATEGORY_CREATE", "CATEGORY", category.id, `إنشاء قسم «${name}»`);

  return NextResponse.json({
    category: {
      id: category.id,
      name: category.name,
      description: category.description,
      image: category.image,
      productCount: 0,
    },
  });
});
