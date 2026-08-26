"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/constants";
import { BrandLogo } from "@/components/brand-logo";
import type { ProductListDTO } from "@/lib/types";

export default function ProductCard({
  product,
  index = 0,
}: {
  product: ProductListDTO;
  index?: number;
}) {
  const price = product.salePrice ?? product.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link
        href={`/products/${product.id}`}
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-card text-right ring-1 ring-border/70 transition-all hover:shadow-lg hover:ring-primary/40"
        aria-label={product.name}
      >
        {/* Image */}
        <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
          {product.primaryImage ? (
            <img
              src={product.primaryImage}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BrandLogo variant="icon" className="h-12 w-12 opacity-40" />
            </div>
          )}

          {product.discountPercent > 0 && !product.isOut && (
            <Badge className="absolute right-2 top-2 z-10 bg-primary text-primary-foreground shadow-sm">
              -{product.discountPercent}%
            </Badge>
          )}

          {product.isOut && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <span className="rounded-full bg-foreground/80 px-3 py-1 text-xs font-bold text-background">
                غير متوفر
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
          {product.categoryName && (
            <p className="text-[11px] text-muted-foreground">{product.categoryName}</p>
          )}

          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1">
            <span
              className={`text-sm font-bold ${product.salePrice ? "text-primary" : "text-foreground"}`}
            >
              {formatPrice(price)}
            </span>
            {product.salePrice && product.salePrice < product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {product.hasColors && product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1" aria-label="الألوان المتاحة">
              {product.colors.slice(0, 5).map((c) => (
                <span
                  key={c.skuId}
                  className={`h-3.5 w-3.5 rounded-full ring-1 ring-border ${
                    c.isOut ? "opacity-40" : ""
                  }`}
                  style={{ backgroundColor: c.hex || "#e2ddd5" }}
                  title={c.name || undefined}
                />
              ))}
              {product.colors.length > 5 && (
                <span className="text-[10px] leading-none text-muted-foreground">
                  +{product.colors.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
