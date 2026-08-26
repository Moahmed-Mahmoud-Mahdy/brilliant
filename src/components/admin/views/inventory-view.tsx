"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Boxes,
  History,
  PackageX,
  TriangleAlert,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { InventoryTxType, SkuRowDTO, InventoryTxDTO } from "@/lib/types";
import { INVENTORY_TX_LABELS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type InventoryFilter = "all" | "low" | "out";

const TX_BADGE_STYLES: Record<InventoryTxType, string> = {
  RECEIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  RESERVE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  RELEASE: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  SALE: "bg-primary/10 text-primary border-primary/30",
  ADJUSTMENT: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
};

function SkuStatusBadge({ sku }: { sku: SkuRowDTO }) {
  if (sku.isOut)
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
        نفد المخزون
      </Badge>
    );
  if (sku.isLow)
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
        منخفض
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
      طبيعي
    </Badge>
  );
}

function ColorCell({ sku }: { sku: SkuRowDTO }) {
  if (!sku.colorName && !sku.colorHex)
    return <span className="text-muted-foreground">— أساسي —</span>;
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-4 w-4 shrink-0 rounded-full border border-border shadow-sm"
        style={{ backgroundColor: sku.colorHex ?? "#cccccc" }}
      />
      {sku.colorName}
    </span>
  );
}

function ProductCell({ sku }: { sku: SkuRowDTO }) {
  return (
    <div className="flex items-center gap-3">
      {sku.productImage ? (
         
        <img
          src={sku.productImage}
          alt={sku.productName}
          className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
          <Boxes className="h-5 w-5 text-muted-foreground" />
        </span>
      )}
      <span className="max-w-44 truncate font-medium" title={sku.productName}>
        {sku.productName}
      </span>
    </div>
  );
}

function TransactionsTable({ transactions }: { transactions: InventoryTxDTO[] }) {
  return (
    <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
      <Table>
        <TableHeader className="sticky top-0 z-10 [&>tr]:bg-card [&>tr]:shadow-[0_1px_0_0_var(--border)]">
          <TableRow>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="text-right">المنتج</TableHead>
            <TableHead className="text-right">كود SKU</TableHead>
            <TableHead className="text-right">نوع الحركة</TableHead>
            <TableHead className="text-right">الكمية</TableHead>
            <TableHead className="text-right">الرصيد</TableHead>
            <TableHead className="text-right">السبب</TableHead>
            <TableHead className="text-right">رقم الطلب</TableHead>
            <TableHead className="text-right">الأدمن</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <History className="h-8 w-8 opacity-40" />
                  <p className="text-sm">لا توجد حركات مخزون مسجَّلة</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleString("ar-EG")}
                </TableCell>
                <TableCell className="max-w-44">
                  <span className="block truncate font-medium" title={tx.productName}>
                    {tx.productName}
                  </span>
                  {tx.colorName && (
                    <span className="text-xs text-muted-foreground">{tx.colorName}</span>
                  )}
                </TableCell>
                <TableCell dir="ltr" className="font-mono text-xs">
                  {tx.skuCode}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("whitespace-nowrap", TX_BADGE_STYLES[tx.type])}
                  >
                    {INVENTORY_TX_LABELS[tx.type] ?? tx.type}
                  </Badge>
                </TableCell>
                <TableCell
                  dir="ltr"
                  className={cn(
                    "font-mono font-semibold",
                    tx.quantity > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : tx.quantity < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                  )}
                >
                  {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                </TableCell>
                <TableCell dir="ltr" className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {tx.balanceBefore} → {tx.balanceAfter}
                </TableCell>
                <TableCell className="max-w-40 truncate text-xs" title={tx.reason ?? ""}>
                  {tx.reason ?? "—"}
                </TableCell>
                <TableCell>
                  {tx.orderNumber ? (
                    <span dir="ltr" className="font-mono text-xs font-semibold text-primary">
                      {tx.orderNumber}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">{tx.adminName ?? "النظام"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function InventoryView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [txSkuId, setTxSkuId] = useState<string | null>(null);
  const [adjustSku, setAdjustSku] = useState<SkuRowDTO | null>(null);

  // Adjust dialog state
  const [adjType, setAdjType] = useState<"RECEIVE" | "ADJUSTMENT">("RECEIVE");
  const [adjQuantity, setAdjQuantity] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-inventory", filter],
    queryFn: () =>
      api.admin.inventory({ lowStock: filter !== "all" }),
  });

  const allSkus = data?.skus ?? [];
  const skus =
    filter === "out" ? allSkus.filter((s) => s.isOut) : allSkus;

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["admin-transactions", txSkuId],
    queryFn: () => api.admin.transactions({ skuId: txSkuId ?? undefined }),
  });
  const transactions = txData?.transactions ?? [];
  const txSku = skus.find((s) => s.id === txSkuId) ?? allSkus.find((s) => s.id === txSkuId);

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!adjustSku) throw new Error("لا يوجد SKU محدد");
      return api.admin.adjustInventory({
        skuId: adjustSku.id,
        type: adjType,
        quantity: Number(adjQuantity),
        reason: adjReason.trim(),
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      toast({
        title: "تم تحديث المخزون",
        description: `الرصيد الجديد: ${res.sku?.available ?? "—"}`,
      });
      setAdjustSku(null);
      setAdjQuantity("");
      setAdjReason("");
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const openAdjust = (sku: SkuRowDTO) => {
    setAdjustSku(sku);
    setAdjType("RECEIVE");
    setAdjQuantity("");
    setAdjReason("");
  };

  const openHistory = (sku: SkuRowDTO) => {
    setTxSkuId(sku.id);
    document.getElementById("inventory-tx-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const submitAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjQuantity || Number.isNaN(Number(adjQuantity))) {
      toast({ title: "أدخلي كمية صحيحة", variant: "destructive" });
      return;
    }
    if (adjType === "RECEIVE" && Number(adjQuantity) <= 0) {
      toast({ title: "كمية الإضافة يجب أن تكون أكبر من صفر", variant: "destructive" });
      return;
    }
    if (adjType === "ADJUSTMENT" && Number(adjQuantity) === 0) {
      toast({ title: "كمية التعديل لا يمكن أن تكون صفرًا", variant: "destructive" });
      return;
    }
    if (!adjReason.trim()) {
      toast({ title: "السبب إلزامي", description: "يُسجَّل السبب في سجل الحركات", variant: "destructive" });
      return;
    }
    adjustMutation.mutate();
  };

  const lowCount = allSkus.filter((s) => s.isLow && !s.isOut).length;
  const outCount = allSkus.filter((s) => s.isOut).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">المخزون</h1>
          <p className="text-sm text-muted-foreground">
            متابعة المخزون لكل منتج وكل لون على حدة — الكميات تعدَّل من هنا فقط
          </p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as InventoryFilter)}>
          <TabsList>
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="low" className="gap-1">
              <TriangleAlert className="h-3.5 w-3.5" />
              مخزون منخفض
            </TabsTrigger>
            <TabsTrigger value="out" className="gap-1">
              <PackageX className="h-3.5 w-3.5" />
              نفد المخزون
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary chips */}
      {filter !== "all" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            منخفض: {lowCount}
          </Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
            نفد: {outCount}
          </Badge>
        </div>
      )}

      {/* SKUs table */}
      <div className="bg-card rounded-2xl border border-border">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : skus.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Boxes className="h-12 w-12 opacity-40" />
            <p className="text-sm">
              {filter === "out"
                ? "لا توجد أصناف نفد مخزونها 🎉"
                : filter === "low"
                  ? "لا يوجد مخزون منخفض حاليًا"
                  : "لا توجد أصناف في المخزون"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">اللون</TableHead>
                  <TableHead className="text-right">كود SKU</TableHead>
                  <TableHead className="text-right">المتاح</TableHead>
                  <TableHead className="text-right">محجوز</TableHead>
                  <TableHead className="text-right">مباع</TableHead>
                  <TableHead className="text-right">حد التنبيه</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((sku) => (
                  <TableRow key={sku.id}>
                    <TableCell>
                      <ProductCell sku={sku} />
                    </TableCell>
                    <TableCell>
                      <ColorCell sku={sku} />
                    </TableCell>
                    <TableCell dir="ltr" className="font-mono text-xs">
                      {sku.skuCode}
                    </TableCell>
                    <TableCell className="font-bold tabular-nums">{sku.available}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help text-muted-foreground tabular-nums underline decoration-dotted underline-offset-4">
                            {sku.reserved}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>محجوز لطلبات مؤكدة</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{sku.sold}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {sku.lowStockThreshold}
                    </TableCell>
                    <TableCell>
                      <SkuStatusBadge sku={sku} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 border-primary/40 text-primary hover:text-primary"
                          onClick={() => openAdjust(sku)}
                        >
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          تعديل المخزون
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1"
                          onClick={() => openHistory(sku)}
                        >
                          <History className="h-3.5 w-3.5" />
                          سجل الحركات
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Transactions log section */}
      <div id="inventory-tx-section" className="bg-card rounded-2xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-display text-lg font-bold">سجل حركات المخزون</h2>
            <p className="text-xs text-muted-foreground">
              كل حركة استلام أو حجز أو بيع أو تعديل — مع السبب والرصيد
            </p>
          </div>
          {txSkuId && (
            <button
              onClick={() => setTxSkuId(null)}
              className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              تصفية على: <span dir="ltr" className="font-mono">{txSku?.skuCode ?? txSkuId.slice(0, 8)}</span>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {txLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <TransactionsTable transactions={transactions} />
        )}
      </div>

      {/* Adjust inventory dialog */}
      <Dialog open={!!adjustSku} onOpenChange={(open) => !open && setAdjustSku(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">تعديل المخزون</DialogTitle>
            <DialogDescription>
              {adjustSku && (
                <span className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="font-semibold">{adjustSku.productName}</span>
                  {adjustSku.colorName && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span
                        aria-hidden
                        className="h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: adjustSku.colorHex ?? "#ccc" }}
                      />
                      {adjustSku.colorName}
                    </span>
                  )}
                  <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                    {adjustSku.skuCode}
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    المتاح حاليًا: {adjustSku.available}
                  </Badge>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAdjust} className="space-y-4">
            <div className="space-y-2">
              <Label>نوع الحركة</Label>
              <Select value={adjType} onValueChange={(v) => setAdjType(v as "RECEIVE" | "ADJUSTMENT")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIVE">إضافة مخزون (استلام +)</SelectItem>
                  <SelectItem value="ADJUSTMENT">تعديل يدوي (±)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adj-qty">الكمية</Label>
              <Input
                id="adj-qty"
                type="number"
                dir="ltr"
                value={adjQuantity}
                onChange={(e) => setAdjQuantity(e.target.value)}
                placeholder={adjType === "RECEIVE" ? "10" : "-2 أو 5"}
                required
              />
              <p className="text-xs text-muted-foreground">
                {adjType === "ADJUSTMENT"
                  ? "يمكن سالبة (لخصم كمية) أو موجبة (لإضافة)"
                  : "كمية موجبة تُضاف للمخزون المتاح"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adj-reason">السبب (إلزامي)</Label>
              <Textarea
                id="adj-reason"
                rows={3}
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="مثل: استلام شحنة جديدة من المورد"
                required
              />
              <p className="text-xs text-muted-foreground">
                يُسجَّل السبب في سجل الحركات ولا يمكن تعديله لاحقًا
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjustSku(null)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={adjustMutation.isPending}>
                {adjustMutation.isPending ? "جارٍ التنفيذ..." : "تنفيذ التعديل"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
