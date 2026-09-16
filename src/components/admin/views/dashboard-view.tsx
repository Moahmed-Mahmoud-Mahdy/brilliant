"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  ChevronLeft,
  Package,
  PackageX,
  ShoppingBag,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { ORDER_STATUS_LABELS, formatPrice } from "@/lib/constants";
import {
  ORDER_STATUSES,
  type OrderStatus,
  type SkuRowDTO,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

// Gold-family chart colors (adapt to dark mode via CSS vars)
const STATUS_CHART_COLORS: Record<OrderStatus, string> = {
  PENDING_REVIEW: "var(--chart-2)",
  CONFIRMED: "var(--chart-1)",
  OUT_FOR_DELIVERY: "var(--chart-3)",
  DELIVERED: "var(--chart-4)",
  REJECTED: "var(--chart-5)",
  CANCELLED: "var(--gold-light)",
};

// ─── Stat card ───
function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconClassName,
  onClick,
  delay = 0,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: typeof BellRing;
  iconClassName: string;
  onClick?: () => void;
  delay?: number;
}) {
  const inner = (
    <Card
      className={`h-full transition-all ${
        onClick ? "cursor-pointer hover:border-primary/50 hover:shadow-md" : ""
      }`}
    >
      <CardContent className="flex items-start justify-between gap-3 overflow-hidden p-3.5 sm:p-5">
        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-2 min-h-[2.25rem] text-xs font-medium leading-snug text-muted-foreground break-words sm:text-sm"
            title={title}
          >
            {title}
          </p>
          <p className="font-display mt-1.5 truncate text-lg font-bold whitespace-nowrap sm:text-2xl">
            {value}
          </p>
          {sub && (
            <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs" title={sub}>
              {sub}
            </p>
          )}
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${iconClassName}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </CardContent>
    </Card>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay }}
        onClick={onClick}
        className="block w-full text-start"
      >
        {inner}
      </motion.button>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      {inner}
    </motion.div>
  );
}

// ─── Low stock / OOS row ───
function StockRow({ sku }: { sku: SkuRowDTO }) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
      <span
        className="h-4 w-4 shrink-0 rounded-full border border-border shadow-inner sm:h-5 sm:w-5"
        style={{ backgroundColor: sku.colorHex ?? "#ccc" }}
        title={sku.colorName ?? ""}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium sm:text-sm" title={sku.productName}>
          {sku.productName}
        </p>
        <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">
          <span className="font-mono" dir="ltr">
            {sku.skuCode}
          </span>
          {sku.colorName ? ` — ${sku.colorName}` : ""}
        </p>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        متاح: <span className="font-bold">{sku.available}</span>
      </span>
      {sku.isOut ? (
        <Badge className="shrink-0 whitespace-nowrap border-destructive/40 bg-destructive/15 text-destructive">
          نفد
        </Badge>
      ) : (
        <Badge className="shrink-0 whitespace-nowrap border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400">
          منخفض
        </Badge>
      )}
    </div>
  );
}

// ─── Main view ───
export default function DashboardView() {
  const router = useRouter();

  const { data: dashData, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.admin.dashboard(),
  });

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ["admin-inventory", "low"],
    queryFn: () => api.admin.inventory({ lowStock: true }),
  });

  const dashboard = dashData?.dashboard;
  const recentOrders = (dashboard?.recentOrders ?? []).slice(0, 8);
  const lowStockSkus = [...(invData?.skus ?? [])].sort((a, b) => {
    if (a.isOut !== b.isOut) return a.isOut ? -1 : 1;
    return a.available - b.available;
  });
  const totalOrders = dashboard
    ? Object.values(dashboard.ordersByStatus).reduce((a, b) => a + b, 0)
    : 0;

  const chartData = ORDER_STATUSES.map((s) => ({
    status: s,
    label: ORDER_STATUS_LABELS[s],
    count: dashboard?.ordersByStatus?.[s] ?? 0,
  }));

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          لوحة <span className="text-gold-gradient">التحكم</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{today}</p>
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          title="طلبات جديدة بانتظار المراجعة"
          value={String(dashboard?.newOrdersCount ?? 0)}
          sub="بحاجة إلى مراجعة سريعة"
          icon={BellRing}
          iconClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          onClick={() => router.push("/admin/orders")}
          delay={0}
        />
        <StatCard
          title="إجمالي مبيعات تم تسليمها"
          value={formatPrice(dashboard?.deliveredSalesTotal ?? 0)}
          sub={`من ${dashboard?.deliveredOrdersCount ?? 0} طلب`}
          icon={BadgeCheck}
          iconClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          delay={0.05}
        />
        <StatCard
          title="مخزون منخفض"
          value={String(dashboard?.lowStockCount ?? 0)}
          sub="أصناف تحت الحد الأدنى"
          icon={AlertTriangle}
          iconClassName="bg-orange-500/15 text-orange-600 dark:text-orange-400"
          onClick={() => router.push("/admin/inventory")}
          delay={0.1}
        />
        <StatCard
          title="منتجات نفدت"
          value={String(dashboard?.outOfStockCount ?? 0)}
          sub="أصناف غير متاحة حالياً"
          icon={PackageX}
          iconClassName="bg-destructive/15 text-destructive"
          onClick={() => router.push("/admin/inventory")}
          delay={0.15}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <StatCard
          title="عدد المنتجات"
          value={String(dashboard?.totalProducts ?? 0)}
          icon={Package}
          iconClassName="bg-primary/15 text-primary"
          onClick={() => router.push("/admin/products")}
          delay={0.2}
        />
        <StatCard
          title="عدد العملاء"
          value={String(dashboard?.totalCustomers ?? 0)}
          icon={Users}
          iconClassName="bg-primary/15 text-primary"
          onClick={() => router.push("/admin/customers")}
          delay={0.25}
        />
        <StatCard
          title="إجمالي الطلبات"
          value={String(totalOrders)}
          icon={ShoppingBag}
          iconClassName="bg-primary/15 text-primary"
          onClick={() => router.push("/admin/orders")}
          delay={0.3}
        />
      </div>

      {/* Chart + low stock */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Orders by status chart */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-display truncate text-base font-bold sm:text-lg">
              الطلبات حسب الحالة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full sm:h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    reversed
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    interval={0}
                  />
                  <YAxis
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      color: "var(--popover-foreground)",
                      fontSize: "12px",
                      direction: "rtl",
                    }}
                    formatter={(value) => [String(value), "عدد الطلبات"]}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_CHART_COLORS[entry.status]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low stock / OOS */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-display truncate text-base font-bold sm:text-lg">
              تنبيهات المخزون
            </CardTitle>
            <Badge variant="outline" className="gold-border-card shrink-0 whitespace-nowrap">
              {lowStockSkus.length} صنف
            </Badge>
          </CardHeader>
          <CardContent>
            {invLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : lowStockSkus.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                لا توجد تنبيهات — المخزون بحالة جيدة
              </p>
            ) : (
              <>
                <div className="max-h-72 space-y-1 overflow-y-auto scrollbar-thin pl-1">
                  {lowStockSkus.slice(0, 10).map((sku) => (
                    <StockRow key={sku.id} sku={sku} />
                  ))}
                </div>
                {lowStockSkus.length > 10 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    + {lowStockSkus.length - 10} صنف آخر
                  </p>
                )}
                <Button
                  onClick={() => router.push("/admin/inventory")}
                  className="mt-3 w-full gap-1"
                  variant="outline"
                >
                  <span className="truncate">إدارة المخزون</span>
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-display truncate text-base font-bold sm:text-lg">
            أحدث الطلبات
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/orders")}
            className="shrink-0 text-primary"
          >
            عرض الكل
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              لا توجد طلبات بعد
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">رقم الطلب</TableHead>
                    <TableHead className="whitespace-nowrap">العميل</TableHead>
                    <TableHead className="whitespace-nowrap">الإجمالي</TableHead>
                    <TableHead className="whitespace-nowrap">الحالة</TableHead>
                    <TableHead className="whitespace-nowrap">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => router.push("/admin/orders")}
                    >
                      <TableCell className="whitespace-nowrap font-mono text-xs font-bold text-primary sm:text-sm">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell
                        className="max-w-[130px] truncate font-medium sm:max-w-[200px]"
                        title={order.customerName}
                      >
                        {order.customerName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold">
                        {formatPrice(order.total)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

