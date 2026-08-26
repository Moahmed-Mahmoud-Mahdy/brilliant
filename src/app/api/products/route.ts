import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PRODUCT_INCLUDE, mapProductList } from "@/lib/inventory";
import type { ProductListDTO } from "@/lib/types";
import { route } from "@/lib/validators";

const effectivePrice = (p: ProductListDTO) => p.salePrice ?? p.price;

export const GET = route(async (request: Request) => {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const categoryId = (url.searchParams.get("categoryId") || "").trim();
  const minPriceRaw = url.searchParams.get("minPrice");
  const maxPriceRaw = url.searchParams.get("maxPrice");
  const availability = url.searchParams.get("availability") || "";
  const sort = url.searchParams.get("sort") || "newest";

  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    include: PRODUCT_INCLUDE,
  });

  let filtered = products;
  if (search) {
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  }
  if (categoryId) {
    filtered = filtered.filter((p) => p.categoryId === categoryId);
  }

  let list = filtered.map(mapProductList);

  const minPrice = minPriceRaw !== null && minPriceRaw !== "" ? Number(minPriceRaw) : null;
  const maxPrice = maxPriceRaw !== null && maxPriceRaw !== "" ? Number(maxPriceRaw) : null;
  if (minPrice !== null && Number.isFinite(minPrice)) {
    list = list.filter((p) => effectivePrice(p) >= minPrice);
  }
  if (maxPrice !== null && Number.isFinite(maxPrice)) {
    list = list.filter((p) => effectivePrice(p) <= maxPrice);
  }

  if (availability === "in_stock") {
    list = list.filter((p) => p.totalAvailable > 0);
  } else if (availability === "out_of_stock") {
    list = list.filter((p) => p.totalAvailable === 0);
  }

  if (sort === "price_asc") {
    list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  } else if (sort === "price_desc") {
    list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  } else {
    // newest first (default)
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return NextResponse.json({ products: list });
});
