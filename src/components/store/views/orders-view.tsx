"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Check,
  X,
  RefreshCw,
  PackageOpen,
  User,
  MapPin,
  Phone,
  Banknote,
  Tag,
  AlertCircle,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useCartStore, useAuthStore } from "@/lib/store";
import { formatPrice, ORDER_STATUS_LABELS } from "@/lib/constants";
import type { OrderDTO, OrderStatus } from "@/lib/types";

const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED: "bg-primary text-primary-foreground",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  DELIVERED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  CANCELLED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const WHATSAPP_LABELS: Record<string, string> = {
  primary: "واتساب على الهاتف الأساسي",
  secondary: "واتساب على الهاتف الثانوي",
  both: "واتساب على كلا الرقمين",
};

const TIMELINE_STEPS = ["تم الإرسال", "تم التأكيد", "جاري التوصيل", "تم التسليم"];
const TIMELINE_STATUSES = ["PENDING_REVIEW", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED"];

// ─── Status timeline ───

function StatusTimeline({ status }: { status: OrderStatus }) {
  const dead = status === "REJECTED" || status === "CANCELLED";
  const currentIdx = dead ? -1 : TIMELINE_STATUSES.indexOf(status);

  const dotState = (i: number): "done" | "current" | "dead" | "future" => {
    if (dead) return i === 0 ? "done" : i === 1 ? "dead" : "future";
    if (i < currentIdx) return "done";
    if (i === currentIdx) return "current";
    return "future";
  };

  const segDone = (i: number) => (dead ? i === 1 : i <= currentIdx);

  return (
    <div className="flex items-start">
      {TIMELINE_STEPS.map((label, i) => {
        const state = dotState(i);
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={`h-0.5 flex-1 rounded ${
                    segDone(i) ? (dead && i === 1 ? "bg-red-500/60" : "bg-primary/60") : "bg-border"
                  }`}
                />
              )}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] transition-all ${
                  state === "done"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : state === "current"
                      ? "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20"
                      : state === "dead"
                        ? "bg-red-500 text-white shadow-sm"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {state === "done" && <Check className="h-3.5 w-3.5" />}
                {state === "dead" && <X className="h-3.5 w-3.5" />}
                {state === "current" && <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" />}
                {state === "future" && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />}
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded ${
                    segDone(i + 1) && !(dead && i + 1 === 1)
                      ? "bg-primary/60"
                      : dead && i + 1 === 1
                        ? "bg-red-500/60"
                        : "bg-border"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-center text-[10px] leading-tight sm:text-xs ${
                state === "dead"
                  ? "font-bold text-red-600 dark:text-red-400"
                  : state === "current"
                    ? "font-bold text-primary"
                    : state === "done"
                      ? "text-foreground/80"
                      : "text-muted-foreground"
              }`}
            >
              {state === "dead" ? ORDER_STATUS_LABELS[status] : label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Order card ───

function OrderCard({ order, index }: { order: OrderDTO; index: number }) {
  const [open, setOpen] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unavailable, setUnavailable] = useState<{ productName: string; colorName: string | null }[]>([]);

  const reorderMutation = useMutation({
    mutationFn: () => api.orders.reorder(order.id),
    onSuccess: (res) => {
      (res.cartItems ?? []).forEach((item) => addItem(item));
      const addedCount = res.cartItems?.length ?? res.added?.length ?? 0;
      setUnavailable(res.unavailable ?? []);
      if (addedCount > 0) {
        toast({
          title: `تمت إضافة ${addedCount} ${addedCount === 1 ? "منتج" : "منتجات"} للسلة ✓`,
          duration: 3000,
        });
        router.push("/cart");
      } else if ((res.unavailable ?? []).length === 0) {
        toast({ title: "لا توجد عناصر متاحة لإعادة الطلب", duration: 3000 });
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => {
      toast({
        title: "تعذر إعادة الطلب",
        description: e instanceof Error ? e.message : "حدث خطأ غير متوقع",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const items = order.items ?? [];
  const created = new Date(order.createdAt);
  const reason = order.rejectionReason || order.cancellationReason || null;
  const reasonLabel = order.rejectionReason ? "سبب الرفض" : order.cancellationReason ? "سبب الإلغاء" : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.06, 0.4) }}
    >
      <Card className="gap-0 overflow-hidden rounded-2xl p-0 py-0">
        {/* Header */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full flex-wrap items-center gap-2 p-4 text-right transition-colors hover:bg-muted/40 md:gap-3"
          aria-expanded={open}
        >
          <span className="font-mono text-sm font-bold text-primary" dir="ltr">
            {order.orderNumber}
          </span>
          <Badge className={`${STATUS_BADGE_CLASSES[order.status]} border-0`}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {created.toLocaleDateString("ar-EG")} —{" "}
            {created.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="ms-auto flex items-center gap-3">
            <span className="text-sm font-bold">{formatPrice(order.total)}</span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {/* Preview items */}
        <div className="flex items-center gap-3 px-4 pb-3">
          {items.slice(0, 2).map((item) => (
            <div key={item.id} className="flex min-w-0 items-center gap-2">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.productImage && (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 max-w-[130px] text-xs font-medium">{item.productName}</p>
                <p className="text-[10px] text-muted-foreground">× {item.quantity}</p>
              </div>
            </div>
          ))}
          {items.length > 2 && (
            <span className="text-xs text-muted-foreground">+{items.length - 2} منتجات أخرى</span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gold-border-card ms-auto shrink-0 gap-1.5"
            onClick={() => reorderMutation.mutate()}
            disabled={reorderMutation.isPending}
          >
            {reorderMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            إعادة الطلب
          </Button>
        </div>

        {/* Expanded details */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-5 border-t bg-muted/20 p-4">
                {/* Timeline */}
                <div className="rounded-xl bg-background/60 p-4">
                  <StatusTimeline status={order.status} />
                </div>

                {/* Unavailable items after reorder */}
                {unavailable.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>بعض عناصر الطلب غير متاحة حاليًا</AlertTitle>
                    <AlertDescription>
                      {unavailable
                        .map((u) => `${u.productName}${u.colorName ? ` — ${u.colorName}` : ""}`)
                        .join("، ")}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Full items */}
                <div>
                  <p className="mb-2 text-sm font-bold">المنتجات ({items.length})</p>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl bg-background/70 p-2.5"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {item.productImage && (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium">{item.productName}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {item.colorName && (
                              <span className="flex items-center gap-1">
                                <span
                                  className="inline-block h-3 w-3 rounded-full ring-1 ring-border"
                                  style={{ backgroundColor: item.colorHex || "#e2ddd5" }}
                                />
                                {item.colorName}
                              </span>
                            )}
                            <span>{formatPrice(item.unitPrice)} × {item.quantity}</span>
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-bold">{formatPrice(item.lineTotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                    <MapPin className="h-4 w-4 text-primary" />
                    العنوان
                  </p>
                  <div className="space-y-1.5 rounded-xl bg-background/70 p-3 text-sm">
                    <p>{order.name}</p>
                    <p className="flex items-center gap-1.5" dir="ltr">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {order.phoneSecondary ? `${order.phonePrimary} / ${order.phoneSecondary}` : order.phonePrimary}
                    </p>
                    <p className="text-xs text-muted-foreground">{WHATSAPP_LABELS[order.whatsappOn]}</p>
                    <Separator className="my-1" />
                    <p>{order.addressText}</p>
                    <p className="text-muted-foreground">
                      الدور {order.floor} — شقة {order.apartment}
                    </p>
                    <p>
                      {order.zoneName}
                      {order.lat != null && order.lng != null && (
                        <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                          ({order.lat.toFixed(4)}, {order.lng.toFixed(4)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Payment summary */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                    <Banknote className="h-4 w-4 text-primary" />
                    ملخص الحساب
                  </p>
                  <div className="space-y-1.5 rounded-xl bg-background/70 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الإجمالي الفرعي</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          خصم {order.discountCode ? `(${order.discountCode})` : ""}
                        </span>
                        <span>- {formatPrice(order.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رسوم التوصيل</span>
                      <span>{formatPrice(order.shippingFee)}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-base">
                      <span className="font-bold">الإجمالي</span>
                      <span className="font-bold text-primary">{formatPrice(order.total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">الدفع عند الاستلام (كاش)</p>
                  </div>
                </div>

                {/* Reason */}
                {reason && reasonLabel && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/60 dark:bg-red-950/40">
                    <p className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      {reasonLabel}
                    </p>
                    <p className="mt-1 text-red-700/90 dark:text-red-300/90">{reason}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Orders view ───

export default function OrdersView() {
  const { customer, loading } = useAuthStore();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.orders.list(),
    enabled: Boolean(customer),
  });

  const orders = [...(data?.orders ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // ── Login prompt ──
  if (!loading && !customer) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
        <span className="pattern-lux flex h-24 w-24 items-center justify-center rounded-full bg-card">
          <User className="h-10 w-10 text-muted-foreground/50" />
        </span>
        <h1 className="font-display mt-6 text-2xl font-bold">سجلي الدخول لعرض طلباتك</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          تابعي حالة طلباتك السابقة وأعيدي طلب مفضلاتك بضغطة واحدة
        </p>
        <Button
          size="lg"
          className="mt-6 gap-2"
          onClick={() => router.push("/auth?redirect=/orders")}
        >
          <User className="h-4 w-4" />
          تسجيل الدخول
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6"
    >
      <h1 className="font-display mb-2 text-2xl font-bold md:text-3xl">
        <span className="text-gold-gradient">طلباتي</span>
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">تابعي حالة طلباتك الحالية والسابقة</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="gold-border-card flex flex-col items-center gap-3 rounded-2xl bg-card py-16 text-center">
          <PackageOpen className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold">لا توجد طلبات بعد</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            عندما تُطلبين لأول مرة ستجدين هنا تفاصيل طلباتك وحالتها
          </p>
          <Button className="mt-2 gap-2" onClick={() => router.push("/products")}>
            <ShoppingBag className="h-4 w-4" />
            ابدئي التسوق
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <OrderCard key={order.id} order={order} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
