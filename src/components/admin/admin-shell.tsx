"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Boxes,
  MapPin,
  Ticket,
  History,
  Settings,
  LogOut,
  Store,
  Bell,
  Moon,
  Sun,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAdminStore } from "@/lib/store";
import { api } from "@/lib/api";
import { BrandLogo } from "@/components/brand-logo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationDTO } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/categories", label: "الأقسام", icon: Boxes },
  { href: "/admin/inventory", label: "المخزون", icon: Boxes },
  { href: "/admin/customers", label: "العملاء", icon: Users },
  { href: "/admin/zones", label: "مناطق التوصيل", icon: MapPin },
  { href: "/admin/offers", label: "العروض", icon: Ticket },
  { href: "/admin/activity", label: "سجل النشاط", icon: History },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

function AdminNotificationBell() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api.admin.notifications(),
    refetchInterval: 30_000,
  });
  const notifications: NotificationDTO[] = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.isRead).length;

  const markRead = async () => {
    if (unread > 0) {
      await api.admin.readNotifications().catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && markRead()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="الإشعارات" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>إشعارات الإدارة</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد إشعارات</p>
          ) : (
            notifications.slice(0, 15).map((n) => (
              <div
                key={n.id}
                className={`px-3 py-2.5 border-b border-border/60 last:border-0 ${
                  n.isRead ? "opacity-70" : "bg-accent/40"
                }`}
              >
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {new Date(n.createdAt).toLocaleString("ar-EG")}
                </p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminLoginScreen() {
  const setAdmin = useAdminStore((s) => s.setAdmin);
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { admin } = await api.admin.login({ username, password });
      setAdmin(admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pattern-lux flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandLogo variant="emblem" className="mx-auto mb-4 h-20 w-20 drop-shadow-md" />
          <h1 className="font-display text-2xl font-bold">
            <span className="text-gold-gradient font-brand inline-block translate-y-[1px]">بريليانت</span> — لوحة التحكم
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">تسجيل دخول المسؤول</p>
        </div>

        <form
          onSubmit={submit}
          className="gold-border-card space-y-4 rounded-2xl bg-card p-6 shadow-xl"
        >
          <div className="space-y-2">
            <label htmlFor="admin-username" className="text-sm font-medium">
              اسم المستخدم
            </label>
            <Input
              id="admin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin1"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="admin-password" className="text-sm font-medium">
              كلمة المرور
            </label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جارٍ التحقق..." : "تسجيل الدخول"}
          </Button>
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
            بيانات تجريبية: <span dir="ltr">admin1</span> / <span dir="ltr">brilliant2026</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/")}
          >
            <Store className="ml-2 h-4 w-4" />
            العودة للمتجر
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, loading, load, logout } = useAdminStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <BrandLogo variant="icon" className="mx-auto mb-4 h-14 w-14 animate-pulse drop-shadow-md" />
          <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!admin) return <AdminLoginScreen />;

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  const currentLabel =
    NAV_ITEMS.find((n) => isActive(n.href))?.label ?? "لوحة التحكم";

  const renderNav = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-5">
        <BrandLogo variant="icon" className="h-10 w-10 shrink-0 drop-shadow-sm" />
        <div>
          <p className="font-brand text-lg">
            <span className="text-gold-gradient">بريليانت</span>
          </p>
          <p className="text-[11px] text-muted-foreground">لوحة التحكم</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="قائمة الإدارة">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileNavOpen(false)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(href)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border p-3">
        <Link
          href="/"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Store className="h-4 w-4" />
          عرض المتجر
        </Link>
        <button
          onClick={async () => {
            await logout();
            router.push("/");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar (right side in RTL) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-l border-sidebar-border bg-sidebar lg:flex">
        {renderNav()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-6">
          {/* Mobile nav */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="القائمة">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="sr-only">قائمة الإدارة</SheetTitle>
              <div className="flex h-full flex-col">{renderNav()}</div>
            </SheetContent>
          </Sheet>

          <h2 className="font-display text-lg font-bold">{currentLabel}</h2>
          <Badge variant="outline" className="hidden sm:inline-flex gold-border-card">
            {admin.name}
          </Badge>

          <div className="mr-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="تبديل الوضع الليلي"
              onClick={() =>
                setTheme(
                  document.documentElement.classList.contains("dark") ? "light" : "dark"
                )
              }
            >
              <Sun className="hidden h-5 w-5 dark:block" />
              <Moon className="h-5 w-5 dark:hidden" />
            </Button>
            <AdminNotificationBell />
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

