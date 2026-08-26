"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Minus,
  Plus,
  ShoppingBag,
  MessageCircle,
  ChevronLeft,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/brand-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useCartStore } from "@/lib/store";
import { formatPrice, whatsappLink } from "@/lib/constants";
import type { ProductDetailDTO } from "@/lib/types";

// ─── Gallery (keyed by product id → internal state resets per product) ───

function Gallery({
  images,
  name,
  discountPercent,
  isOut,
}: {
  images: string[];
  name: string;
  discountPercent: number;
  isOut: boolean;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(images.length - 1, 0));
  const currentImage = images[safeIndex];

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/70">
        <AnimatePresence mode="wait">
          {currentImage ? (
            <motion.img
              key={currentImage}
              src={currentImage}
              alt={name}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BrandLogo variant="icon" className="h-20 w-20 opacity-40" />
            </div>
          )}
        </AnimatePresence>

        {discountPercent > 0 && !isOut && (
          <Badge className="absolute right-3 top-3 z-10 bg-primary px-2.5 py-1 text-primary-foreground shadow-sm">
            خصم {discountPercent}%
          </Badge>
        )}
        {isOut && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <span className="rounded-full bg-foreground/80 px-4 py-1.5 text-sm font-bold text-background">
              غير متوفر
            </span>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {images.map((img, i) => (
            <button
              key={img + i}
              onClick={() => setIndex(i)}
              aria-label={`صورة ${i + 1}`}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition-all ${
                i === safeIndex ? "ring-primary" : "ring-transparent hover:ring-primary/40"
              }`}
            >
              <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Purchase panel (colors + quantity + add to cart / WhatsApp CTA) ───

function PurchasePanel({ product }: { product: ProductDetailDTO }) {
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const { toast } = useToast();

  const hasColors = Boolean(product.hasColors && product.colors.length > 0);

  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(() => {
    const inStock = product.colors.find((c) => !c.isOut);
    return (inStock ?? product.colors[0])?.skuId ?? null;
  });
  const [quantity, setQuantity] = useState(1);

  const selectedSku = product.colors.find((c) => c.skuId === selectedSkuId) ?? null;
  const selectedColorName = hasColors ? selectedSku?.name || null : null;
  const maxQuantity = selectedSku
    ? Math.max(1, selectedSku.available)
    : Math.max(1, product.totalAvailable);

  const selectionIsOut =
    Boolean(product.isOut) || (hasColors && Boolean(selectedSku?.isOut)) || !selectedSku;

  const unitPrice = product.salePrice ?? product.price;

  const clampQuantity = (q: number) => Math.min(Math.max(1, q), maxQuantity);

  const handleAddToCart = () => {
    if (!selectedSku || selectionIsOut) return;
    addItem({
      skuId: selectedSku.skuId,
      productId: product.id,
      name: product.name,
      image: product.primaryImage,
      colorName: hasColors ? selectedColorName : null,
      colorHex: hasColors ? selectedSku.hex : null,
      unitPrice: product.salePrice ?? product.price,
      basePrice: product.price,
      quantity,
      maxQuantity: selectedSku.available,
    });
    toast({
      title: "تمت الإضافة إلى السلة ✓",
      description: `${product.name}${selectedColorName ? ` — ${selectedColorName}` : ""}`,
      action: (
        <ToastAction altText="الانتقال للسلة" onClick={() => router.push("/cart")}>
          الانتقال للسلة
        </ToastAction>
      ),
      duration: 5000,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Colors */}
      {hasColors && (
        <div>
          <p className="mb-3 text-sm font-semibold">
            اختاري اللون
            {selectedColorName && (
              <span className="ms-2 font-normal text-muted-foreground">( {selectedColorName} )</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {product.colors.map((color) => {
              const isSelected = color.skuId === selectedSkuId;
              return (
                <Tooltip key={color.skuId}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setSelectedSkuId(color.skuId);
                        setQuantity(1);
                      }}
                      aria-label={color.name || "لون"}
                      className={`relative h-10 w-10 rounded-full transition-all ${
                        color.isOut ? "cursor-not-allowed opacity-50" : "hover:scale-110"
                      } ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "ring-1 ring-border"
                      }`}
                      style={{ backgroundColor: color.hex || "#e2ddd5" }}
                    >
                      {color.isOut && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="h-0.5 w-[130%] rotate-45 rounded bg-destructive/80" />
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {color.isOut ? "غير متوفر — تواصلي معنا" : color.name || "اللون الأساسي"}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity + Add to cart */}
      <div className="flex flex-wrap items-center gap-3">
        {!selectionIsOut && (
          <>
            <div className="flex items-center rounded-xl ring-1 ring-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity((q) => clampQuantity(q - 1))}
                disabled={quantity <= 1}
                aria-label="تقليل الكمية"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-sm font-bold tabular-nums">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (quantity >= maxQuantity) {
                    toast({ title: `الكمية المتاحة ${maxQuantity} فقط`, duration: 2500 });
                    return;
                  }
                  setQuantity((q) => clampQuantity(q + 1));
                }}
                disabled={quantity >= maxQuantity}
                aria-label="زيادة الكمية"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button size="lg" className="min-w-[200px] flex-1 gap-2" onClick={handleAddToCart}>
              <ShoppingBag className="h-4 w-4" />
              أضيفي للسلة — {formatPrice(unitPrice * quantity)}
            </Button>
          </>
        )}

        {selectionIsOut && (
          <a
            href={whatsappLink(
              `مرحبًا، أرغب في الاستفسار عن توفر: ${product.name}${
                selectedColorName ? ` — ${selectedColorName}` : ""
              }`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2 border-emerald-600/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
              <MessageCircle className="h-4 w-4" />
              غير متوفر — تواصلي عبر واتساب
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Product view ───

export default function ProductView({ productId }: { productId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.product(productId),
    enabled: Boolean(productId),
  });
  const product = data?.product;

  const images = useMemo(() => {
    if (!product) return [];
    return product.images?.length
      ? product.images
      : product.primaryImage
        ? [product.primaryImage]
        : [];
  }, [product]);

  // ── Guards & loading ──

  if (isLoading || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-24 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const unitPrice = product.salePrice ?? product.price;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8"
    >
      {/* Breadcrumb */}
      <nav
        aria-label="مسار التنقل"
        className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          الرئيسية
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <Link href="/products" className="hover:text-foreground">
          المنتجات
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="line-clamp-1 max-w-[180px] text-foreground/80">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* ── Gallery (right in RTL) ── */}
        <Gallery
          key={`gallery-${product.id}`}
          images={images}
          name={product.name}
          discountPercent={product.discountPercent}
          isOut={product.isOut}
        />

        {/* ── Info (left in RTL) ── */}
        <div className="flex flex-col">
          {product.categoryName && (
            <Badge variant="outline" className="gold-border-card mb-3 w-fit text-primary">
              {product.categoryName}
            </Badge>
          )}

          <h1 className="font-display text-2xl font-bold leading-snug md:text-3xl">
            {product.name}
          </h1>

          {/* Price block */}
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">{formatPrice(unitPrice)}</span>
            {product.salePrice && product.salePrice < product.price && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Stock hint */}
          {product.totalAvailable > 0 && product.totalAvailable <= 5 && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
              <Flame className="h-4 w-4" />
              متبقٍ {product.totalAvailable} فقط — اطلبيه الآن
            </p>
          )}

          <Separator className="my-6" />

          <PurchasePanel key={`panel-${product.id}`} product={product} />

          {/* Description */}
          {product.description && (
            <div className="mt-8">
              <h2 className="font-display mb-2 text-lg font-bold">الوصف</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          {/* Attributes */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display mb-2 text-lg font-bold">المواصفات</h2>
              <div className="overflow-hidden rounded-xl ring-1 ring-border/70">
                {product.attributes.map((attr, i) => (
                  <div
                    key={i}
                    className={`flex items-start justify-between gap-4 px-4 py-2.5 text-sm ${
                      i % 2 === 0 ? "bg-muted/40" : "bg-transparent"
                    }`}
                  >
                    <span className="shrink-0 text-muted-foreground">{attr.key}</span>
                    <span className="text-right font-medium">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
