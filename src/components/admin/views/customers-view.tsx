"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Ban,
  Info,
  MessageCircle,
  PackageX,
  Search,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/constants";
import type { CustomerSummaryDTO } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Egyptian local phone (01xxxxxxxxx) → international (20xxxxxxxxxx)
function toInternational(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return digits;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CustomerAvatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] font-bold text-primary-foreground ${
        size === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-xs"
      }`}
    >
      {initials(name)}
    </span>
  );
}

// ─── Customer details dialog ───
function CustomerDetailsDialog({
  customer,
  open,
  onClose,
}: {
  customer: CustomerSummaryDTO | null;
  open: boolean;
  onClose: () => void;
}) {
  const stats = customer
    ? [
        {
          label: "إجمالي الطلبات",
          value: String(customer.ordersCount),
          icon: ShoppingBag,
          iconClass: "bg-primary/15 text-primary",
        },
        {
          label: "طلبات مسلّمة",
          value: String(customer.deliveredCount),
          icon: BadgeCheck,
          iconClass:
            "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        },
        {
          label: "طلبات ملغاة",
          value: String(customer.cancelledCount),
          icon: Ban,
          iconClass: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
        },
        {
          label: "طلبات مرفوضة",
          value: String(customer.rejectedCount),
          icon: PackageX,
          iconClass: "bg-destructive/15 text-destructive",
        },
      ]
    : [];

  const whatsappUrl = customer
    ? `https://wa.me/${toInternational(customer.phone)}?text=${encodeURIComponent(
        `مرحباً ${customer.name}، معك فريق بريليانت للعناية والتجميل.`
      )}`
    : "#";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto scrollbar-thin">
        {customer ? (
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <CustomerAvatar name={customer.name} size="lg" />
                <div className="text-start">
                  <DialogTitle className="font-display text-xl">
                    {customer.name}
                  </DialogTitle>
                  <DialogDescription>
                    <span className="font-mono" dir="ltr">
                      {customer.phone}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <Card key={s.label} className="border-border">
                  <CardContent className="flex items-center gap-3 p-3.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.iconClass}`}
                    >
                      <s.icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="font-display text-lg font-bold">
                        {s.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Total spent */}
            <Card className="gold-border-card bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    إجمالي الإنفاق (طلبات مسلّمة)
                  </p>
                  <p className="font-display text-2xl font-bold text-primary">
                    {formatPrice(customer.totalSpent)}
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              عميل منذ {formatDate(customer.createdAt)}
            </p>

            {/* Password policy note (BRD §8.6 — passwords are never shown/reset from admin) */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>إجراءات الحساب</AlertTitle>
              <AlertDescription>
                إجراءات الحساب تُدار وفق صلاحيات الأدمن — استرجاع كلمة المرور
                يدوي عبر واتساب، ولا يمكن عرض كلمات المرور أو تعديلها من هنا.
              </AlertDescription>
            </Alert>

            <Button asChild variant="outline" className="w-full">
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                مراسلة العميل عبر واتساب
              </a>
            </Button>
          </div>
        ) : (
          <DialogTitle className="sr-only">تفاصيل العميل</DialogTitle>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main view ───
export default function CustomersView() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<CustomerSummaryDTO | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", debouncedSearch],
    queryFn: () =>
      api.admin.customers({ search: debouncedSearch || undefined }),
  });

  const customers = useMemo(() => data?.customers ?? [], [data]);

  const openDetails = (customer: CustomerSummaryDTO) => {
    setSelected(customer);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          عملاء <span className="text-gold-gradient font-brand inline-block translate-y-[1px] text-3xl sm:text-4xl">بريليانت</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {customers.length} عميل{debouncedSearch && " (نتيجة البحث)"}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ابحث باسم العميل أو رقم الهاتف..."
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

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-7 w-7 text-primary" />
            </span>
            <div>
              <p className="font-semibold">لا يوجد عملاء مطابقون</p>
              <p className="mt-1 text-sm text-muted-foreground">
                جرّب تغيير كلمات البحث أو مسحها
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
                    <TableHead>العميل</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead className="text-center">الطلبات</TableHead>
                    <TableHead className="text-center">مسلّمة</TableHead>
                    <TableHead className="text-center">ملغاة</TableHead>
                    <TableHead className="text-center">مرفوضة</TableHead>
                    <TableHead>إجمالي الإنفاق</TableHead>
                    <TableHead>تاريخ التسجيل</TableHead>
                    <TableHead className="text-center">التفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer, i) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                      className="hover:bg-muted/50 border-b cursor-pointer transition-colors"
                      onClick={() => openDetails(customer)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <CustomerAvatar name={customer.name} />
                          <span className="font-medium">{customer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm" dir="ltr">
                          {customer.phone}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {customer.ordersCount}
                      </TableCell>
                      <TableCell className="text-center text-emerald-600 dark:text-emerald-400">
                        {customer.deliveredCount}
                      </TableCell>
                      <TableCell className="text-center text-zinc-500 dark:text-zinc-400">
                        {customer.cancelledCount}
                      </TableCell>
                      <TableCell className="text-center text-destructive">
                        {customer.rejectedCount}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap text-primary">
                        {formatPrice(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatDate(customer.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetails(customer);
                          }}
                        >
                          التفاصيل
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {customers.map((customer) => (
              <Card
                key={customer.id}
                className="cursor-pointer transition-colors hover:border-primary/40"
                onClick={() => openDetails(customer)}
              >
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex items-center gap-3">
                    <CustomerAvatar name={customer.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {customer.name}
                      </p>
                      <p
                        className="font-mono text-xs text-muted-foreground"
                        dir="ltr"
                      >
                        {customer.phone}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    <div className="rounded-lg bg-muted/60 py-1.5">
                      <p className="font-bold">{customer.ordersCount}</p>
                      <p className="text-muted-foreground">طلبات</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 py-1.5">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        {customer.deliveredCount}
                      </p>
                      <p className="text-muted-foreground">مسلّمة</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 py-1.5">
                      <p className="font-bold text-zinc-500 dark:text-zinc-400">
                        {customer.cancelledCount}
                      </p>
                      <p className="text-muted-foreground">ملغاة</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 py-1.5">
                      <p className="font-bold text-destructive">
                        {customer.rejectedCount}
                      </p>
                      <p className="text-muted-foreground">مرفوضة</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2.5">
                    <span className="text-xs text-muted-foreground">
                      منذ {formatDate(customer.createdAt)}
                    </span>
                    <span className="font-bold text-primary">
                      {formatPrice(customer.totalSpent)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Details dialog */}
      <CustomerDetailsDialog
        customer={selected}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}
