"use client";

import Link from "next/link";
import { Lock, MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/constants";
import { BrandLogo } from "@/components/brand-logo";

export function StoreFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-card/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-4">
              <BrandLogo
                variant="emblem"
                className="h-20 w-20 shrink-0 drop-shadow-sm"
              />
              <div>
                <p className="font-brand text-2xl">
                  <span className="text-gold-gradient">بريليانت</span>
                </p>
                <p className="text-[11px] tracking-[0.35em] text-muted-foreground/70 uppercase" dir="ltr">
                  Brilliant
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-xs">
              وجهتك الفاخرة لمنتجات العناية بالبشرة والتجميل الأصلية، بجودة مختارة
              بعناية وتوصيل داخل القاهرة والجيزة.
            </p>
          </div>

          <nav aria-label="روابط سريعة">
            <h3 className="text-sm font-bold mb-3">روابط سريعة</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link className="hover:text-foreground" href="/">
                  الصفحة الرئيسية
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" href="/products">
                  كل المنتجات
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" href="/orders">
                  طلباتي
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-bold mb-3">التوصيل والدفع</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>🚚 التوصيل داخل القاهرة والجيزة فقط</li>
              <li>💵 الدفع عند الاستلام (كاش)</li>
              <li>
                <a
                  href={whatsappLink("مرحبًا، أرغب في الاستفسار عن منتجاتكم")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-500" />
                  <span>خدمة العملاء والواتساب:</span>
                  <span dir="ltr" className="font-mono font-semibold text-foreground">01559562033</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 pt-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} بريليانت — جميع الحقوق محفوظة
          </p>
          {/* Hidden admin entry (BRD: مسار الأدمن غير ظاهر داخل الموقع العام) */}
          <Link
            href="/admin"
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1"
            aria-label="لوحة التحكم"
            title="لوحة التحكم"
          >
            <Lock className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
