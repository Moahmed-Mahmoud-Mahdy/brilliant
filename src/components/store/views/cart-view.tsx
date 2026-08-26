"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  Banknote,
  ArrowLeft,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCartStore, useAuthStore, cartTotals } from "@/lib/store";
import { formatPrice } from "@/lib/constants";

export default function CartView() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clear);
  const customer = useAuthStore((s) => s.customer);
  const router = useRouter();
  const { toast } = useToast();

  const { subtotal, count, savings } = cartTotals(items);

  const changeQuantity = (skuId: string, itemMax: number, next: number) => {
    if (next > itemMax) {
      toast({ title: `الكمية المتاحة ${itemMax} فقط`, duration: 2500 });
      return;
    }
    updateQuantity(skuId, next);
  };

  const goCheckout = () => {
    if (!customer) {
      router.push("/auth?redirect=/checkout");
    } else {
      router.push("/checkout");
    }
  };

  // ── Empty state ──
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center sm:px-6"
      >
        <span className="pattern-lux flex h-24 w-24 items-center justify-center rounded-full bg-card">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
        </span>
        <h1 className="font-display mt-6 text-2xl font-bold">سلتك فارغة</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          لم تضيفي أي منتجات بعد — اكتشفي مجموعتنا واختاري ما يناسبك
        </p>
        <Button size="lg" className="mt-6 gap-2" onClick={() => router.push("/products")}>
          ابدئي التسوق
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
    >
      <h1 className="font-display mb-6 text-2xl font-bold md:text-3xl">
        <span className="text-gold-gradient">سلة التسوق</span>
        <span className="ms-2 text-sm font-normal text-muted-foreground">
          ({count} {count === 1 ? "منتج" : "منتجات"})
        </span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── Items ── */}
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <motion.div
              key={item.skuId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
            >
              <Card className="flex-row items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4">
                {/* Image */}
                <button
                  onClick={() => router.push(`/products/${item.productId}`)}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted"
                  aria-label={item.name}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <ShoppingBag className="h-6 w-6" />
                    </span>
                  )}
                </button>

                {/* Details */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <button
                    onClick={() => router.push(`/products/${item.productId}`)}
                    className="text-right text-sm font-semibold leading-snug hover:text-primary"
                  >
                    <span className="line-clamp-1">{item.name}</span>
                  </button>
                  {item.colorName && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: item.colorHex || "#e2ddd5" }}
                      />
                      {item.colorName}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatPrice(item.unitPrice)} للوحدة
                  </span>

                  {/* Quantity stepper */}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center rounded-lg ring-1 ring-border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => changeQuantity(item.skuId, item.maxQuantity, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="تقليل الكمية"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-xs font-bold tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => changeQuantity(item.skuId, item.maxQuantity, item.quantity + 1)}
                        aria-label="زيادة الكمية"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeItem(item.skuId)}
                      aria-label="حذف من السلة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Line total */}
                <div className="shrink-0 self-start pt-1 text-left sm:self-center sm:text-center">
                  <p className="text-sm font-bold text-primary">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </p>
                  {item.basePrice > item.unitPrice && (
                    <p className="text-[11px] text-muted-foreground line-through">
                      {formatPrice(item.basePrice * item.quantity)}
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Summary ── */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="gold-border-card gap-4 rounded-2xl bg-card p-5">
            <h2 className="font-display text-lg font-bold">ملخص الطلب</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">عدد المنتجات</span>
                <span className="font-semibold">{count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الإجمالي الفرعي</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    وفّرتِ
                  </span>
                  <span className="font-semibold">{formatPrice(savings)}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-base">
              <span className="font-bold">الإجمالي</span>
              <span className="text-xl font-bold text-primary">{formatPrice(subtotal)}</span>
            </div>

            <p className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <Banknote className="h-4 w-4 shrink-0 text-primary" />
              الدفع عند الاستلام (كاش) — يُضاف الشحن حسب المنطقة
            </p>

            <Button size="lg" className="w-full gap-2" onClick={goCheckout}>
              إتمام الطلب
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push("/products")}>
              متابعة التسوق
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full text-center text-xs text-destructive/80 underline-offset-4 hover:text-destructive hover:underline">
                  تفريغ السلة
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>تفريغ السلة؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حذف جميع المنتجات من سلتك. لا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>تراجعي</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => clearCart()}
                  >
                    نعم، فرّغي السلة
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
