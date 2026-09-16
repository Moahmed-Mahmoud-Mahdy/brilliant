"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBag, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useCartStore } from "@/lib/store";
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
  const router = useRouter();
  const { toast } = useToast();
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const price = product.salePrice ?? product.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.isOut) return;

    // Pick first available SKU (color variant or base SKU)
    const targetSku = product.colors.find((c) => !c.isOut) ?? product.colors[0];
    if (!targetSku) return;

    const colorName = product.hasColors && targetSku.name ? targetSku.name : null;
    const colorHex = product.hasColors && targetSku.hex ? targetSku.hex : null;

    addItem({
      skuId: targetSku.skuId,
      productId: product.id,
      name: product.name,
      image: product.primaryImage,
      colorName,
      colorHex,
      unitPrice: price,
      basePrice: product.price,
      quantity: 1,
      maxQuantity: targetSku.available > 0 ? targetSku.available : 99,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1800);

    toast({
      title: "تمت الإضافة إلى السلة ✓",
      description: `${product.name}${colorName ? ` — ${colorName}` : ""}`,
      action: (
        <ToastAction altText="الانتقال للسلة" onClick={() => router.push("/cart")}>
          الانتقال للسلة
        </ToastAction>
      ),
      duration: 4000,
    });
  };

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

          {!product.isOut && (
            <button
              onClick={handleAddToCart}
              aria-label="إضافة سريعة للسلة"
              title="إضافة سريعة للسلة"
              className={`absolute bottom-2.5 left-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-primary hover:text-primary-foreground ${
                added ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""
              }`}
            >
              {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p
            className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight break-words"
            title={product.name}
          >
            {product.name}
          </p>
          {product.categoryName && (
            <p className="line-clamp-1 truncate text-[11px] text-muted-foreground">
              {product.categoryName}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1">
            <span
              className={`whitespace-nowrap text-sm font-bold ${
                product.salePrice ? "text-primary" : "text-foreground"
              }`}
            >
              {formatPrice(price)}
            </span>
            {product.salePrice && product.salePrice < product.price && (
              <span className="whitespace-nowrap text-xs text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {product.hasColors && product.colors.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-1.5 pt-1 overflow-hidden"
              aria-label="الألوان المتاحة"
            >
              {product.colors.slice(0, 5).map((c) => (
                <span
                  key={c.skuId}
                  className={`h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-border ${
                    c.isOut ? "opacity-40" : ""
                  }`}
                  style={{ backgroundColor: c.hex || "#e2ddd5" }}
                  title={c.name || undefined}
                />
              ))}
              {product.colors.length > 5 && (
                <span className="text-[10px] leading-none text-muted-foreground whitespace-nowrap">
                  +{product.colors.length - 5}
                </span>
              )}
            </div>
          )}

          <Button
            size="sm"
            variant={product.isOut ? "secondary" : added ? "outline" : "default"}
            disabled={product.isOut}
            onClick={handleAddToCart}
            className={`mt-2.5 w-full gap-1.5 text-xs font-semibold shadow-xs transition-all ${
              added ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : ""
            }`}
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">تمت الإضافة</span>
              </>
            ) : product.isOut ? (
              <span className="truncate">غير متوفر</span>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">إضافة للسلة</span>
              </>
            )}
          </Button>
        </div>
      </Link>
    </motion.div>
  );
}


