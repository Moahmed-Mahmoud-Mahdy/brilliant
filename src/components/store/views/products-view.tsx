"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Search, PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import ProductCard from "./product-card";

type SortOption = "newest" | "price_asc" | "price_desc";
type AvailabilityOption = "all" | "in_stock" | "out_of_stock";

export default function ProductsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL is the source of truth for shareable filters (search/category/availability)
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "all";
  const categoryName = searchParams.get("categoryName") ?? "";
  const availability =
    (searchParams.get("availability") as AvailabilityOption) || "all";

  // Local-only controls (not part of the URL)
  const [sort, setSort] = useState<SortOption>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Debounce the search value before hitting the API
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.categories(),
  });
  const categories = categoriesData?.categories ?? [];
  const activeCategory = categories.find((c) => c.id === categoryId);

  // Update the URL query params (shareable state)
  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "all") params.delete(k);
      else params.set(k, v);
    });
    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });
  };

  const setSearchValue = (v: string) =>
    updateParams({ search: v || undefined });

  const setCategory = (v: string) => {
    if (v === "all") {
      updateParams({ categoryId: undefined, categoryName: undefined });
    } else {
      const cat = categories.find((c) => c.id === v);
      updateParams({ categoryId: v, categoryName: cat?.name });
    }
  };

  const setAvailabilityValue = (v: AvailabilityOption) =>
    updateParams({ availability: v });

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      categoryId: categoryId !== "all" ? categoryId : undefined,
      availability,
      sort,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    }),
    [debouncedSearch, categoryId, availability, sort, minPrice, maxPrice]
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", params],
    queryFn: () => api.products(params),
    placeholderData: keepPreviousData,
  });

  const products = data?.products ?? [];

  const resetFilters = () => {
    router.replace("/products", { scroll: false });
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
  };

  const hasActiveFilters =
    Boolean(search) ||
    categoryId !== "all" ||
    availability !== "all" ||
    sort !== "newest" ||
    Boolean(minPrice) ||
    Boolean(maxPrice);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          <span className="text-gold-gradient">
            {categoryName || activeCategory?.name || "كل المنتجات"}
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {search ? `نتائج البحث عن "${search}"` : "اختاري ما يناسبك من مجموعتنا"}
        </p>
      </div>

      {/* Filters bar */}
      <Card className="mb-6 gap-4 rounded-2xl p-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          تصفية وترتيب
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ms-auto inline-flex items-center gap-1 rounded-full text-xs text-destructive hover:underline"
            >
              <X className="h-3 w-3" />
              إزالة الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="space-y-1.5">
            <Label htmlFor="products-search">البحث</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="products-search"
                value={search}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="ابحثي عن منتج..."
                className="pr-9"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>القسم</Label>
            <Select value={categoryId} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="كل الأقسام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقسام</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.productCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Availability */}
          <div className="space-y-1.5">
            <Label>التوفر</Label>
            <Select
              value={availability}
              onValueChange={(v) => setAvailabilityValue(v as AvailabilityOption)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="in_stock">متوفر</SelectItem>
                <SelectItem value="out_of_stock">غير متوفر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="space-y-1.5">
            <Label>الترتيب</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="price_asc">السعر: من الأقل</SelectItem>
                <SelectItem value="price_desc">السعر: من الأعلى</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Price range */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32 space-y-1.5">
            <Label htmlFor="min-price">أقل سعر (جنيه)</Label>
            <Input
              id="min-price"
              type="number"
              min={0}
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
            />
          </div>
          <div className="w-32 space-y-1.5">
            <Label htmlFor="max-price">أعلى سعر (جنيه)</Label>
            <Input
              id="max-price"
              type="number"
              min={0}
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="∞"
            />
          </div>
          {(categoryName || activeCategory?.name) && (
            <Badge variant="outline" className="gold-border-card gap-1">
              {categoryName || activeCategory?.name}
            </Badge>
          )}
        </div>
      </Card>

      {/* Results count */}
      <p className="mb-4 text-sm text-muted-foreground">
        {isLoading ? "جارٍ تحميل المنتجات..." : `${products.length} منتج`}
        {isFetching && !isLoading && <span className="ms-2 opacity-60">...تحديث</span>}
      </p>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="gold-border-card flex flex-col items-center gap-3 rounded-2xl bg-card py-16 text-center">
          <PackageSearch className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold">لا توجد منتجات مطابقة</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            جرّبي تعديل الفلاتر أو البحث بكلمات مختلفة
          </p>
          <Button variant="outline" className="gold-border-card mt-2" onClick={resetFilters}>
            إعادة تعيين الفلاتر
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
