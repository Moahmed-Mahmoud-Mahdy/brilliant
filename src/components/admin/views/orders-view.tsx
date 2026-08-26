"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Ban,
  CheckCircle,
  Download,
  Lock,
  MapPin,
  MessageCircle,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { ORDER_STATUS_LABELS, formatPrice } from "@/lib/constants";
import { ORDER_STATUSES, type OrderDTO, type OrderStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// ─── Status badge (no blue — luxury gold palette) ───
const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  PENDING_REVIEW:
    "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  CONFIRMED: "border-primary/40 bg-primary/15 text-primary",
  OUT_FOR_DELIVERY:
    "border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-400",
  DELIVERED:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  REJECTED: "border-destructive/40 bg-destructive/15 text-destructive",
  CANCELLED:
    "border-zinc-500/40 bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

type OrderAction = "confirm" | "reject" | "out_for_delivery" | "deliver" | "cancel";

const ACTION_SUCCESS_MESSAGES: Record<OrderAction, string> = {
  confirm: "تم تأكيد الطلب وحجز الكمية",
  reject: "تم رفض الطلب",
  out_for_delivery: "تم بدء توصيل الطلب",
  deliver: "تم تسجيل تسليم الطلب بنجاح",
  cancel: "تم إلغاء الطلب وتحرير الكمية المحجوزة",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG");
}

// ─── CSV export (UTF-8 BOM so Arabic opens correctly in Excel) ───
function exportOrdersCsv(orders: OrderDTO[], statusFilter: string) {
  const headers = [
    "رقم الطلب",
    "التاريخ",
    "العميل",
    "الهاتف",
    "المنطقة",
    "الحالة",
    "الإجمالي الفرعي",
    "الخصم",
    "الشحن",
    "الإجمالي",
  ];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      new Date(o.createdAt).toLocaleString("ar-EG"),
      o.customerName || o.name,
      o.phonePrimary,
      o.zoneName,
      ORDER_STATUS_LABELS[o.status],
      String(o.subtotal),
      String(o.discountAmount),
      String(o.shippingFee),
      String(o.total),
    ].map(esc).join(",")
  );
  const csv = `\uFEFF${[headers.join(","), ...rows].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `brilliant-orders-${new Date().toISOString().slice(0, 10)}${
    statusFilter !== "ALL" ? `-${statusFilter}` : ""
  }.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── WhatsApp indicator on a phone line ───
function PhoneLine({
  phone,
  hasWhatsapp,
}: {
  phone: string;
  hasWhatsapp: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-sm" dir="ltr">
        {phone}
      </span>
      {hasWhatsapp && (
        <MessageCircle
          className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
          aria-label="واتساب"
        />
      )}
    </span>
  );
}

// ─── Print receipt (hidden on screen, only visible via @media print) ───
function ReceiptArea({ order }: { order: OrderDTO }) {
  return (
    <div
      dir="rtl"
      className="print-area hidden bg-white p-6 text-black print:block"
    >
      <div className="mb-4 border-b border-black/20 pb-3 text-center">
        <h1 className="font-brand text-3xl">بريليانت</h1>
        <p className="mt-0.5 text-xs">BRILLIANT — إيصال طلب</p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <p>
          رقم الطلب:{" "}
          <span className="font-mono font-bold">{order.orderNumber}</span>
        </p>
        <p>التاريخ: {formatDateTime(order.createdAt)}</p>
        <p>العميل: {order.customerName || order.name}</p>
        <p>
          الهاتف: <span className="font-mono">{order.phonePrimary}</span>
        </p>
      </div>

      <div className="mb-4 border-y border-dashed border-black/25 py-2 text-sm">
        <p className="font-semibold">عنوان التوصيل:</p>
        <p>
          {order.addressText} — الدور {order.floor} — شقة {order.apartment}
        </p>
        <p>المنطقة: {order.zoneName}</p>
        {order.phoneSecondary && <p>هاتف إضافي: {order.phoneSecondary}</p>}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/30">
            <th className="py-1.5 text-start font-semibold">المنتج</th>
            <th className="py-1.5 text-center font-semibold">الكمية</th>
            <th className="py-1.5 text-center font-semibold">السعر</th>
            <th className="py-1.5 text-end font-semibold">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-black/10">
              <td className="py-1.5">
                {item.productName}
                {item.colorName ? ` — ${item.colorName}` : ""}
              </td>
              <td className="py-1.5 text-center">{item.quantity}</td>
              <td className="py-1.5 text-center">{formatPrice(item.unitPrice)}</td>
              <td className="py-1.5 text-end">{formatPrice(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>الإجمالي الفرعي</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>
              الخصم{order.discountCode ? ` (${order.discountCode})` : ""}
            </span>
            <span>-{formatPrice(order.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>الشحن</span>
          <span>{formatPrice(order.shippingFee)}</span>
        </div>
        <div className="flex justify-between border-t border-black/30 pt-1 text-base font-bold">
          <span>الإجمالي</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="mt-5 text-center text-xs">
        <p className="font-semibold">الدفع عند الاستلام — Cash on Delivery</p>
        <p className="mt-1">شكراً لتسوقكم مع بريليانت</p>
      </div>
    </div>
  );
}

// ─── Order details dialog ───
function OrderDetailsDialog({
  orderId,
  open,
  onClose,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => api.admin.order(orderId as string),
    enabled: open && !!orderId,
  });

  const order = data?.order;
  const history = data?.customerHistory;

  const actionMutation = useMutation({
    mutationFn: (vars: { action: OrderAction; reason?: string }) =>
      api.admin.updateOrder(orderId as string, vars),
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setRejectOpen(false);
      setCancelOpen(false);
      setRejectReason("");
      setCancelReason("");
      toast({
        title: ACTION_SUCCESS_MESSAGES[vars.action],
        description:
          vars.action === "reject" || vars.action === "cancel"
            ? "تم إشعار العميل بالتحديث"
            : undefined,
      });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "فشل تنفيذ الإجراء",
        description: err.message,
      });
    },
  });

  const run = (action: OrderAction, reason?: string) =>
    actionMutation.mutate({ action, reason });

  const resetSubDialogs = () => {
    setRejectOpen(false);
    setCancelOpen(false);
    setRejectReason("");
    setCancelReason("");
  };

  const pending = actionMutation.isPending;
  const whatsappOn = order?.whatsappOn;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            resetSubDialogs();
            onClose();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto scrollbar-thin">
          {isLoading || !order ? (
            <div className="space-y-4 py-2">
              <DialogTitle className="sr-only">جارٍ تحميل تفاصيل الطلب</DialogTitle>
              <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-10 w-2/3" />
              {isError && (
                <p className="text-center text-sm text-destructive">
                  تعذر تحميل تفاصيل الطلب
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Header */}
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle className="font-mono text-xl font-bold text-primary sm:text-2xl">
                    {order.orderNumber}
                  </DialogTitle>
                  <StatusBadge status={order.status} />
                </div>
                <DialogDescription>
                  {formatDateTime(order.createdAt)}
                </DialogDescription>
              </DialogHeader>

              {/* Customer card */}
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-base font-bold">
                      {order.customerName}
                    </p>
                    {order.name && order.name !== order.customerName && (
                      <Badge variant="secondary" className="text-xs">
                        اسم التوصيل: {order.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                    <PhoneLine
                      phone={order.phonePrimary}
                      hasWhatsapp={
                        whatsappOn === "primary" || whatsappOn === "both"
                      }
                    />
                    {order.phoneSecondary && (
                      <PhoneLine
                        phone={order.phoneSecondary}
                        hasWhatsapp={
                          whatsappOn === "secondary" || whatsappOn === "both"
                        }
                      />
                    )}
                  </div>
                  <div className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="font-medium">{order.addressText}</p>
                    <p className="text-muted-foreground">
                      الدور {order.floor} — شقة {order.apartment}
                    </p>
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {order.zoneName}
                    </p>
                    {order.lat != null && order.lng != null && (
                      <a
                        href={`https://maps.google.com/?q=${order.lat},${order.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                        dir="ltr"
                      >
                        عرض على الخريطة
                        <MapPin className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Items */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead className="text-center">السعر</TableHead>
                      <TableHead className="text-center">الكمية</TableHead>
                      <TableHead className="text-end">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.productImage ? (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover"
                              />
                            ) : (
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 p-1.5">
                                <img src="/brand/icon-gold.png" alt="" className="h-full w-full object-contain opacity-70" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="max-w-52 truncate font-medium sm:max-w-none">
                                {item.productName}
                              </p>
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {item.colorHex && (
                                  <span
                                    className="inline-block h-2.5 w-2.5 rounded-full border border-border"
                                    style={{ backgroundColor: item.colorHex }}
                                  />
                                )}
                                {item.colorName && (
                                  <span>{item.colorName}</span>
                                )}
                                <span className="font-mono" dir="ltr">
                                  {item.skuCode}
                                </span>
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {formatPrice(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          ×{item.quantity}
                        </TableCell>
                        <TableCell className="text-end font-semibold whitespace-nowrap">
                          {formatPrice(item.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-1.5 rounded-xl bg-muted/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الإجمالي الفرعي</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-primary">
                    <span className="flex items-center gap-2">
                      الخصم
                      {order.discountCode && (
                        <Badge
                          variant="outline"
                          className="gold-border-card font-mono text-[10px]"
                          dir="ltr"
                        >
                          {order.discountCode}
                        </Badge>
                      )}
                    </span>
                    <span>-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الشحن</span>
                  <span>
                    {order.shippingFee > 0
                      ? formatPrice(order.shippingFee)
                      : "مجاني"}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-base font-bold">
                  <span>الإجمالي</span>
                  <span className="text-primary">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              {/* Customer history */}
              {history && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">سجل العميل:</span>
                  <Badge variant="secondary">
                    {history.ordersCount} طلبات
                  </Badge>
                  <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    {history.deliveredCount} مسلّمة
                  </Badge>
                  <Badge className="border-zinc-500/40 bg-zinc-500/15 text-zinc-600 dark:text-zinc-400">
                    {history.cancelledCount} ملغاة
                  </Badge>
                  <Badge className="border-destructive/40 bg-destructive/15 text-destructive">
                    {history.rejectedCount} مرفوضة
                  </Badge>
                </div>
              )}

              {/* Reasons */}
              {order.rejectionReason && (
                <Alert variant="destructive">
                  <AlertTitle>سبب الرفض</AlertTitle>
                  <AlertDescription>{order.rejectionReason}</AlertDescription>
                </Alert>
              )}
              {order.cancellationReason && (
                <Alert variant="destructive">
                  <AlertTitle>سبب الإلغاء</AlertTitle>
                  <AlertDescription>
                    {order.cancellationReason}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                {order.status === "PENDING_REVIEW" && (
                  <>
                    <Button
                      onClick={() => run("confirm")}
                      disabled={pending}
                      className="font-semibold"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {pending ? "جارٍ التنفيذ..." : "تأكيد الطلب"}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRejectOpen(true)}
                      disabled={pending}
                    >
                      <Ban className="h-4 w-4" />
                      رفض
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setCancelOpen(true)}
                      disabled={pending}
                    >
                      إلغاء
                    </Button>
                  </>
                )}
                {order.status === "CONFIRMED" && (
                  <>
                    <Button
                      onClick={() => run("out_for_delivery")}
                      disabled={pending}
                      className="font-semibold"
                    >
                      <Truck className="h-4 w-4" />
                      {pending ? "جارٍ التنفيذ..." : "بدء التوصيل"}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setCancelOpen(true)}
                      disabled={pending}
                    >
                      إلغاء الطلب
                    </Button>
                  </>
                )}
                {order.status === "OUT_FOR_DELIVERY" && (
                  <>
                    <Button
                      onClick={() => run("deliver")}
                      disabled={pending}
                      className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                    >
                      <PackageCheck className="h-4 w-4" />
                      {pending ? "جارٍ التنفيذ..." : "تم التسليم"}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setCancelOpen(true)}
                      disabled={pending}
                    >
                      إلغاء
                    </Button>
                  </>
                )}
                {["DELIVERED", "REJECTED", "CANCELLED"].includes(
                  order.status
                ) && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    حالة نهائية — لا توجد إجراءات متاحة
                  </p>
                )}

                <Button
                  variant="outline"
                  className="mr-auto"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                  طباعة الإيصال
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog — reason mandatory (BR-11) */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              رفض الطلب {order?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              كتابة سبب الرفض إلزامية، وسيظهر السبب للعميل في تفاصيل طلبه.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="اكتب سبب الرفض... مثال: الكمية المطلوبة غير متوفرة حالياً"
            rows={3}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              رجوع
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || pending}
              onClick={() => run("reject", rejectReason.trim())}
            >
              {pending ? "جارٍ الرفض..." : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog — reason optional */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              إلغاء الطلب {order?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              سيتم تحرير الكمية المحجوزة وإعادتها للمخزون المتاح.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="سبب الإلغاء (اختياري)"
            rows={2}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              رجوع
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run("cancel", cancelReason.trim() || undefined)
              }
            >
              {pending ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print receipt — rendered outside the dialog portal so print CSS positions it correctly */}
      {order && open && <ReceiptArea order={order} />}
    </>
  );
}

// ─── Main view ───
export default function OrdersView() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-orders", statusFilter, debouncedSearch],
    queryFn: () =>
      api.admin.orders({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: debouncedSearch || undefined,
      }),
  });

  const { data: dashData } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.admin.dashboard(),
  });

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const counts = dashData?.dashboard?.ordersByStatus;
  const totalCount = counts
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : undefined;

  const openDetails = (id: string) => {
    setSelectedId(id);
    setDetailsOpen(true);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            إدارة <span className="text-gold-gradient">الطلبات</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length} طلب معروض
            {debouncedSearch && " (نتيجة البحث)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            تحديث
          </Button>
          <Button
            size="sm"
            onClick={() => exportOrdersCsv(orders, statusFilter)}
            disabled={orders.length === 0}
          >
            <Download className="h-4 w-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        <div className="overflow-x-auto pb-1 scrollbar-thin">
          <Tabs
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-full"
          >
            <TabsList className="h-auto w-max gap-0.5">
              <TabsTrigger value="ALL" className="px-3">
                الكل
                {totalCount !== undefined && (
                  <span className="text-[10px] text-muted-foreground">
                    ({totalCount})
                  </span>
                )}
              </TabsTrigger>
              {ORDER_STATUSES.map((s) => (
                <TabsTrigger key={s} value={s} className="px-3">
                  {ORDER_STATUS_LABELS[s]}
                  {counts?.[s] !== undefined && (
                    <span className="text-[10px] text-muted-foreground">
                      ({counts[s]})
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف..."
            className="pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="مسح البحث"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </span>
            <div>
              <p className="font-semibold">لا توجد طلبات مطابقة</p>
              <p className="mt-1 text-sm text-muted-foreground">
                جرّب تغيير حالة الفلتر أو مسح البحث
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>المنطقة</TableHead>
                    <TableHead className="text-center">المنتجات</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                      className="hover:bg-muted/50 border-b cursor-pointer transition-colors"
                      onClick={() => openDetails(order.id)}
                    >
                      <TableCell className="font-mono text-xs font-bold text-primary sm:text-sm">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.customerName}</div>
                        <div
                          className="text-xs text-muted-foreground"
                          dir="ltr"
                        >
                          {order.phonePrimary}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.zoneName}
                      </TableCell>
                      <TableCell className="text-center">
                        {order.items.length}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">
                        {formatPrice(order.total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="cursor-pointer transition-colors hover:border-primary/40"
                onClick={() => openDetails(order.id)}
              >
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-primary">
                      {order.orderNumber}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{order.customerName}</span>
                    <span
                      className="text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {order.phonePrimary}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{order.zoneName}</span>
                    <span>{order.items.length} منتجات</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs">{formatDate(order.createdAt)}</span>
                    <span className="font-bold">{formatPrice(order.total)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Details dialog */}
      <OrderDetailsDialog
        orderId={selectedId}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}
