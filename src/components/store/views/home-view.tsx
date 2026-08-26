"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Brush,
  Scissors,
  Flower2,
  Droplets,
  Gift,
  Truck,
  Banknote,
  BadgeCheck,
  MessageCircle,
  ArrowLeft,
  PackageSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { BrandLogo } from "@/components/brand-logo";
import ProductCard from "./product-card";

const CATEGORY_ICONS = [Sparkles, Brush, Scissors, Flower2, Droplets, Gift];

const VALUE_PROPS = [
  {
    icon: Truck,
    title: "توصيل سريع",
    desc: "داخل القاهرة والجيزة",
  },
  {
    icon: Banknote,
    title: "الدفع عند الاستلام",
    desc: "كاش عند باب منزلك",
  },
  {
    icon: BadgeCheck,
    title: "منتجات أصلية مضمونة",
    desc: "جودة مختارة بعناية",
  },
  {
    icon: MessageCircle,
    title: "دعم عبر واتساب",
    desc: "إجابة سريعة لاستفساراتك",
  },
];

// ─── Hero banner carousel ───

function HeroCarousel() {
  const { data, isLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: () => api.banners(),
  });
  const banners = data?.banners ?? [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full rounded-3xl md:h-[420px]" />;
  }

  if (banners.length === 0) {
    return (
      <div className="pattern-lux gold-border-card relative flex h-[300px] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl bg-card px-6 text-center md:h-[420px]">
        <BrandLogo variant="emblem" className="h-24 w-24 drop-shadow-md md:h-28 md:w-28" />
        <h1 className="font-brand text-4xl md:text-6xl">
          <span className="text-gold-gradient">بريليانت</span>
        </h1>
        <p className="max-w-md text-sm text-muted-foreground md:text-base">
          وجهتك الفاخرة لمنتجات العناية بالبشرة والتجميل الأصلية
        </p>
        <Button size="lg" asChild className="gap-2">
          <Link href="/products" className="flex items-center gap-2">
            تسوقي الآن
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const banner = banners[Math.min(index, banners.length - 1)];

  return (
    <div className="pattern-lux relative h-[300px] w-full overflow-hidden rounded-3xl bg-card md:h-[420px]">
      <AnimatePresence mode="popLayout">
        <motion.img
          key={banner.id}
          src={banner.image}
          alt={banner.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          onError={(e) => {
            // Graceful fallback if the banner asset is missing
            e.currentTarget.style.opacity = "0";
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>

      {/* Overlay gradient (text side = right, RTL start) */}
      <div className="absolute inset-0 bg-gradient-to-l from-background/95 via-background/50 to-transparent" />

      <div className="absolute inset-0 flex items-center">
        <div className="w-full max-w-xl px-6 md:px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-3xl font-bold leading-snug drop-shadow-sm md:text-5xl">
                {banner.title}
              </h2>
              {banner.subtitle && (
                <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-lg">
                  {banner.subtitle}
                </p>
              )}
              <Button size="lg" asChild className="mt-6 gap-2">
                <Link href="/products" className="flex items-center gap-2">
                  تسوقي الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIndex(i)}
              aria-label={`الإعلان ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-primary shadow-sm"
                  : "w-2 bg-foreground/30 hover:bg-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Categories row ───

function CategoriesRow() {
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.categories(),
  });
  const categories = data?.categories ?? [];

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-[130px] shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-thin">
      {categories.map((cat, i) => {
        const Icon = CATEGORY_ICONS[i % CATEGORY_ICONS.length];
        return (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.4) }}
            whileHover={{ y: -4 }}
            className="gold-border-card group flex min-w-[128px] flex-col items-center gap-2 rounded-2xl bg-card p-4 transition-shadow hover:shadow-md"
          >
            <Link
              href={`/products?categoryId=${cat.id}&categoryName=${encodeURIComponent(cat.name)}`}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold">{cat.name}</span>
              <span className="text-[11px] text-muted-foreground">{cat.productCount} منتج</span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Featured products ───

function FeaturedSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "home", "newest"],
    queryFn: () => api.products({ sort: "newest" }),
  });
  const products = (data?.products ?? []).slice(0, 8);

  return (
    <section aria-label="وصل حديثًا">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            <span className="text-gold-gradient">وصل حديثًا</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            أحدث إضافات مجموعتنا المختارة بعناية
          </p>
        </div>
        <Button variant="outline" asChild className="gold-border-card shrink-0">
          <Link href="/products" className="flex items-center gap-2">
            عرض كل المنتجات
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="gold-border-card flex flex-col items-center gap-3 rounded-2xl bg-card py-12 text-center">
          <PackageSearch className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">لا توجد منتجات بعد</p>
          <Button variant="outline" asChild>
            <Link href="/products">تصفحي المنتجات</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Value props ───

function ValueProps() {
  return (
    <section aria-label="لماذا بريليانت">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {VALUE_PROPS.map((prop, i) => (
          <motion.div
            key={prop.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            className="gold-border-card flex items-center gap-3 rounded-2xl bg-card p-4"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <prop.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{prop.title}</p>
              <p className="text-xs text-muted-foreground">{prop.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Home view ───

export default function HomeView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-7xl space-y-12 px-4 py-6 sm:px-6 md:py-8"
    >
      <HeroCarousel />

      <section aria-label="الأقسام">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            <span className="text-gold-gradient">تسوقي حسب القسم</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">اختاري ما يناسب روتين جمالك</p>
        </div>
        <CategoriesRow />
      </section>

      <FeaturedSection />

      <ValueProps />
    </motion.div>
  );
}
