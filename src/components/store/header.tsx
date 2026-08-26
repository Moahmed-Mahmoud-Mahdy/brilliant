"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  ShoppingBag,
  User,
  Moon,
  Sun,
  Bell,
  Menu,
  Package,
  LogIn,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCartStore, useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationDTO } from "@/lib/types";
import { formatPrice } from "@/lib/constants";
import { BrandLogo } from "@/components/brand-logo";

function NotificationBell() {
  const { customer } = useAuthStore();
  const queryClient = useQueryClient();
  const enabled = Boolean(customer);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
    enabled,
    refetchInterval: 30_000,
  });
  const notifications: NotificationDTO[] = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.isRead).length;

  const markRead = async () => {
    if (unread > 0) {
      await api.readNotifications().catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  if (!enabled) return null;

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
        <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا توجد إشعارات بعد
            </p>
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

function AccountMenu() {
  const { customer, logout } = useAuthStore();
  const router = useRouter();

  if (!customer) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gold-border-card gap-2"
        onClick={() => router.push("/auth")}
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">تسجيل الدخول</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="حسابي">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {customer.name}
          <p className="text-xs font-normal text-muted-foreground" dir="ltr">
            {customer.phone}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/orders")} className="gap-2">
          <Package className="h-4 w-4" />
          طلباتي
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await logout();
            router.push("/");
          }}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <LogIn className="h-4 w-4" />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StoreHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { items } = useCartStore();
  const { customer, load } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(search.trim() ? `/products?search=${encodeURIComponent(search.trim())}` : "/products");
    setMobileOpen(false);
  };

  const navLinks = [
    { label: "الرئيسية", href: "/", active: pathname === "/" },
    {
      label: "المنتجات",
      href: "/products",
      active: pathname.startsWith("/products"),
    },
    {
      label: "طلباتي",
      href: customer ? "/orders" : "/auth",
      active: pathname === "/orders",
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="بريليانت — الصفحة الرئيسية">
          <BrandLogo variant="icon" className="h-10 w-10 drop-shadow-sm" />
          <span className="font-brand text-2xl">
            <span className="text-gold-gradient">بريليانت</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 mr-2" aria-label="التنقل الرئيسي">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                link.active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <form onSubmit={submitSearch} className="hidden lg:flex flex-1 max-w-sm mr-auto">
          <div className="relative w-full">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحثي عن منتج..."
              className="w-full rounded-full pr-9 bg-card h-9"
              aria-label="البحث في المنتجات"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 mr-auto lg:mr-0">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="تبديل الوضع الليلي"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden h-5 w-5 dark:block" />
            <Moon className="h-5 w-5 dark:hidden" />
          </Button>

          <NotificationBell />
          <AccountMenu />

          {/* Mobile nav sheet */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="القائمة"
                suppressHydrationWarning
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-xs p-0 flex flex-col">
              <SheetTitle className="sr-only">قائمة التنقل</SheetTitle>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BrandLogo variant="icon" className="h-9 w-9" />
                  <p className="font-brand text-xl">
                    <span className="text-gold-gradient">بريليانت</span>
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="إغلاق">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block w-full rounded-lg px-4 py-2.5 text-right text-sm font-medium ${
                      link.active ? "bg-accent" : "hover:bg-muted"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Button className="w-full gap-2 mt-2" onClick={() => { router.push("/cart"); setMobileOpen(false); }}>
                  <ShoppingBag className="h-4 w-4" />
                  سلة التسوق {cartCount > 0 && `(${cartCount})`}
                </Button>
              </div>
              <form onSubmit={submitSearch} className="px-4 mt-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحثي عن منتج..."
                    className="w-full rounded-full pr-9"
                  />
                </div>
              </form>
            </SheetContent>
          </Sheet>

          {/* Cart button */}
          <Button
            variant="outline"
            size="sm"
            className="ml-1 gap-2 gold-border-card"
            onClick={() => router.push("/cart")}
            aria-label={`سلة التسوق (${cartCount} منتجات)`}
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="text-xs font-semibold hidden sm:inline">
                {formatPrice(cartTotal)}
              </span>
            )}
            {cartCount > 0 && (
              <Badge className="sm:hidden h-5 min-w-5 px-1" variant="default">{cartCount}</Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
