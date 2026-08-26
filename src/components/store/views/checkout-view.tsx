"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Phone,
  MapPin,
  Building2,
  ClipboardCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingBag,
  Tag,
  X,
  MessageCircle,
  Smartphone,
  Truck,
  Banknote,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useCartStore, useAuthStore, cartTotals } from "@/lib/store";
import { formatPrice, whatsappLink } from "@/lib/constants";
import type { OrderDTO } from "@/lib/types";

const PHONE_RE = /^01[0125][0-9]{8}$/;
const PHONE_ERROR = "أدخلي رقم هاتف مصري صحيح (11 رقم يبدأ بـ 01)";

const STEPS = [
  { icon: User, label: "بياناتك" },
  { icon: Phone, label: "هاتف إضافي" },
  { icon: MapPin, label: "العنوان" },
  { icon: Building2, label: "المنطقة والتفاصيل" },
  { icon: ClipboardCheck, label: "المراجعة" },
];

const WHATSAPP_LABELS: Record<string, string> = {
  primary: "الهاتف الأساسي",
  secondary: "الهاتف الثانوي",
  both: "كلا الرقمين",
};

export default function CheckoutView() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const { customer, loading } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [placedOrder, setPlacedOrder] = useState<OrderDTO | null>(null);

  // ── Form state ──
  const [name, setName] = useState("");
  const [phonePrimary, setPhonePrimary] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [whatsappOn, setWhatsappOn] = useState<"primary" | "secondary" | "both">("primary");
  const [addressText, setAddressText] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [applied, setApplied] = useState<{ code: string; percentage: number } | null>(null);

  // Prefill from customer session
  useEffect(() => {
    if (customer) {
      setName((n) => n || customer.name);
      setPhonePrimary((p) => p || customer.phone);
    }
  }, [customer]);

  // Auth guard → send to login, come back here after
  useEffect(() => {
    if (!loading && !customer && !placedOrder && items.length > 0) {
      router.replace("/auth?redirect=/checkout");
    }
  }, [loading, customer, placedOrder, items.length, router]);

  const { subtotal, count } = cartTotals(items);
  const discountAmount = applied ? (subtotal * applied.percentage) / 100 : 0;

  const { data: zonesData, isLoading: zonesLoading } = useQuery({
    queryKey: ["zones"],
    queryFn: () => api.zones(),
    enabled: items.length > 0,
  });
  const zones = zonesData?.zones ?? [];
  const zone = zones.find((z) => z.id === zoneId);
  const shippingFee = zone?.shippingFee ?? 0;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  // ── Validation ──
  const stepValid = useMemo(
    () => [
      name.trim().length >= 2 && PHONE_RE.test(phonePrimary),
      PHONE_RE.test(phoneSecondary) && phoneSecondary !== phonePrimary,
      addressText.trim().length >= 10,
      floor.trim().length > 0 && apartment.trim().length > 0 && zoneId !== "",
      true,
    ],
    [name, phonePrimary, phoneSecondary, addressText, floor, apartment, zoneId]
  );

  // ── Discount code ──
  const applyDiscount = async () => {
    const code = discountInput.trim().toUpperCase();
    if (!code || discountLoading) return;
    setDiscountLoading(true);
    setDiscountError("");
    try {
      const res = await api.validateDiscount({ code, subtotal });
      if (res.valid) {
        setApplied({ code: res.code || code, percentage: res.percentage });
        setDiscountInput("");
        toast({ title: `تم تطبيق كود الخصم ${code} ✓`, duration: 3000 });
      } else {
        setDiscountError(res.error || "كود الخصم غير صالح أو منتهي الصلاحية");
      }
    } catch (e) {
      setDiscountError(e instanceof Error ? e.message : "تعذر التحقق من الكود");
    } finally {
      setDiscountLoading(false);
    }
  };

  // ── Geolocation ──
  const locateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "تعذر تحديد الموقع", variant: "destructive", duration: 3000 });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast({
          title: "تعذر تحديد الموقع",
          description: "تأكدي من السماح بالوصول للموقع من إعدادات المتصفح",
          variant: "destructive",
          duration: 4000,
        });
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  // ── Submit order ──
  const orderMutation = useMutation({
    mutationFn: () =>
      api.orders.create({
        items: items.map((i) => ({ skuId: i.skuId, quantity: i.quantity })),
        name: name.trim(),
        phonePrimary,
        phoneSecondary,
        whatsappOn,
        addressText: addressText.trim(),
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        floor: floor.trim(),
        apartment: apartment.trim(),
        zoneId,
        ...(applied ? { discountCode: applied.code } : {}),
      }),
    onSuccess: (res) => {
      setPlacedOrder(res.order);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => {
      toast({
        title: "تعذر إتمام الطلب",
        description: e instanceof Error ? e.message : "حدث خطأ غير متوقع، حاولي مرة أخرى",
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  const submitOrder = () => {
    if (!stepValid.slice(0, 4).every(Boolean) || items.length === 0) return;
    orderMutation.mutate();
  };

  // ── Success screen ──
  if (placedOrder) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
        >
          <CheckCircle2 className="h-24 w-24 text-emerald-500" strokeWidth={1.5} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 flex flex-col items-center"
        >
          <h1 className="font-display text-3xl font-bold">تم استلام طلبك!</h1>
          <p className="font-display mt-4 text-4xl font-bold tracking-wide" dir="ltr">
            <span className="text-gold-gradient">{placedOrder.orderNumber}</span>
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            طلبك الآن بانتظار مراجعة فريقنا وسيتم إشعارك بالقرار عبر الإشعارات في أقرب وقت.
            الدفع عند الاستلام.
          </p>
          <div className="gold-border-card mt-6 flex items-center gap-3 rounded-2xl bg-card px-6 py-4">
            <Banknote className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">إجمالي الطلب</span>
            <span className="text-xl font-bold text-primary">
              {formatPrice(placedOrder.total)}
            </span>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => router.push("/orders")}>
              طلباتي
            </Button>
            <Button size="lg" variant="outline" className="gold-border-card" onClick={() => router.push("/products")}>
              متابعة التسوق
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center sm:px-6">
        <span className="pattern-lux flex h-24 w-24 items-center justify-center rounded-full bg-card">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
        </span>
        <h1 className="font-display mt-6 text-2xl font-bold">سلتك فارغة</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          أضيفي منتجات إلى سلتك أولًا لتتمكني من إتمام الطلب
        </p>
        <Button size="lg" className="mt-6 gap-2" onClick={() => router.push("/products")}>
          ابدئي التسوق
        </Button>
      </div>
    );
  }

  // ── Auth loading guard ──
  if (loading || !customer) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const fieldError = (invalid: boolean, value: string) =>
    value.length > 0 && invalid ? "text-destructive" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-3xl px-4 py-8 sm:px-6"
    >
      <h1 className="font-display mb-2 text-center text-2xl font-bold md:text-3xl">
        <span className="text-gold-gradient">إتمام الطلب</span>
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        خطوات قليلة ويوصلك طلبك — الدفع عند الاستلام
      </p>

      {/* ── Stepper ── */}
      <div className="relative mb-8">
        <div className="absolute top-[18px] right-[10%] left-[10%] h-0.5 bg-border" />
        <div className="relative grid grid-cols-5">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <div key={s.label} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                    done
                      ? "bg-emerald-600 text-white shadow-sm"
                      : current
                        ? "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span
                  className={`max-w-[72px] text-center text-[10px] leading-tight sm:text-xs ${
                    current ? "font-bold text-primary" : done ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Steps ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Card className="gap-5 rounded-2xl p-5 md:p-6">
            {/* Step 1: بياناتك */}
            {step === 0 && (
              <>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-bold">بياناتك</h2>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="co-name">الاسم بالكامل *</Label>
                  <Input
                    id="co-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: سارة أحمد"
                  />
                  {name.length > 0 && name.trim().length < 2 && (
                    <p className="text-xs text-destructive">أدخلي الاسم (حرفان على الأقل)</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="co-phone">رقم الهاتف الأساسي *</Label>
                  <Input
                    id="co-phone"
                    dir="ltr"
                    inputMode="numeric"
                    value={phonePrimary}
                    onChange={(e) => setPhonePrimary(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                    placeholder="01xxxxxxxxx"
                    className={`text-right ${phonePrimary.length === 11 && !PHONE_RE.test(phonePrimary) ? "ring-1 ring-destructive" : ""}`}
                  />
                  {phonePrimary.length === 11 && !PHONE_RE.test(phonePrimary) && (
                    <p className="text-xs text-destructive">{PHONE_ERROR}</p>
                  )}
                </div>

                <Separator />

                {/* Discount code */}
                <div className="space-y-1.5">
                  <Label htmlFor="co-discount" className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    كود الخصم (اختياري)
                  </Label>
                  {applied ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950/40">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        خصم {applied.percentage}% — وفّرتِ{" "}
                        {formatPrice((subtotal * applied.percentage) / 100)}
                      </span>
                      <button
                        onClick={() => setApplied(null)}
                        className="rounded-full p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                        aria-label="إزالة كود الخصم"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          id="co-discount"
                          value={discountInput}
                          onChange={(e) => {
                            setDiscountInput(e.target.value);
                            setDiscountError("");
                          }}
                          placeholder="مثال: WELCOME10"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          className="gold-border-card shrink-0"
                          onClick={applyDiscount}
                          disabled={!discountInput.trim() || discountLoading}
                        >
                          {discountLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "تطبيق"
                          )}
                        </Button>
                      </div>
                      {discountError && <p className="text-xs text-destructive">{discountError}</p>}
                    </>
                  )}
                </div>
              </>
            )}

            {/* Step 2: هاتف إضافي */}
            {step === 1 && (
              <>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-bold">هاتف إضافي وواتساب</h2>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="co-phone2">رقم هاتف إضافي *</Label>
                  <Input
                    id="co-phone2"
                    dir="ltr"
                    inputMode="numeric"
                    value={phoneSecondary}
                    onChange={(e) => setPhoneSecondary(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                    placeholder="01xxxxxxxxx"
                    className={`text-right ${phoneSecondary.length === 11 && !PHONE_RE.test(phoneSecondary) ? "ring-1 ring-destructive" : ""}`}
                  />
                  {phoneSecondary.length === 11 && !PHONE_RE.test(phoneSecondary) && (
                    <p className="text-xs text-destructive">{PHONE_ERROR}</p>
                  )}
                  {phoneSecondary.length === 11 &&
                    PHONE_RE.test(phoneSecondary) &&
                    phoneSecondary === phonePrimary && (
                      <p className="text-xs text-destructive">
                        لا يمكن استخدام نفس رقم الهاتف الأساسي — أدخلي رقمًا مختلفًا
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label>على أي رقم تفضّلين رسائل واتساب؟</Label>
                  <RadioGroup
                    value={whatsappOn}
                    onValueChange={(v) => setWhatsappOn(v as "primary" | "secondary" | "both")}
                    className="gap-2"
                  >
                    {[
                      { value: "primary", label: "الهاتف الأساسي على واتساب", phone: phonePrimary },
                      { value: "secondary", label: "الهاتف الثانوي على واتساب", phone: phoneSecondary },
                      { value: "both", label: "كلاهما", phone: `${phonePrimary} / ${phoneSecondary}` },
                    ].map((opt) => (
                      <Label
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                          whatsappOn === opt.value
                            ? "border-primary bg-accent/60"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <RadioGroupItem value={opt.value} />
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                        <span className="flex-1 text-sm font-medium">{opt.label}</span>
                        {opt.phone && (
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {opt.phone}
                          </span>
                        )}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Step 3: العنوان */}
            {step === 2 && (
              <>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-bold">العنوان</h2>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="co-address">عنوان التوصيل بالتفصيل *</Label>
                  <Textarea
                    id="co-address"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder="مثال: 12 شارع النصر، مدينة نصر، أمام الصيدلية، الدور الثالث"
                    rows={3}
                  />
                  <div className={`flex justify-between text-xs ${fieldError(addressText.trim().length < 10, addressText)}`}>
                    <span>
                      {addressText.trim().length < 10
                        ? "اكتبي العنوان بالتفصيل (10 أحرف على الأقل)"
                        : "✓ العنوان واضح"}
                    </span>
                    <span>{addressText.trim().length}/10</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="gold-border-card gap-2"
                    onClick={locateMe}
                    disabled={locating}
                  >
                    {locating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    استخدام موقعي الحالي
                  </Button>

                  {coords ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950/40">
                      <span className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                        <Check className="h-4 w-4" />
                        تم تحديد الموقع ✓
                        <span className="font-normal text-emerald-700/80 dark:text-emerald-400/80" dir="ltr">
                          ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
                        </span>
                      </span>
                      <button
                        onClick={() => setCoords(null)}
                        className="rounded-full p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                        aria-label="إزالة الموقع"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      تحديد الموقع اختياري — يساعد مندوب التوصيل في الوصول إليك أسرع
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Step 4: المنطقة والتفاصيل */}
            {step === 3 && (
              <>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-bold">المنطقة وتفاصيل المبنى</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="co-floor">الدور *</Label>
                    <Input
                      id="co-floor"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder="مثال: الثالث"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-apartment">رقم الشقة/العمارة *</Label>
                    <Input
                      id="co-apartment"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                      placeholder="مثال: شقة 5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>منطقة التوصيل *</Label>
                  {zonesLoading ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select value={zoneId || undefined} onValueChange={setZoneId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختاري منطقتك" />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.name} — شحن {formatPrice(z.shippingFee)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {zone && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Truck className="h-3.5 w-3.5 text-primary" />
                      رسوم التوصيل إلى {zone.name}: {formatPrice(zone.shippingFee)}
                    </p>
                  )}
                </div>

                <Alert className="border-primary/30 bg-accent/50">
                  <AlertDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    التوصيل متاح حاليًا داخل القاهرة والجيزة فقط. خارج النطاق؟
                    <a
                      href={whatsappLink("مرحبًا، أرغب في الطلب لكن منطقتي خارج نطاق التوصيل")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      تواصلي معنا عبر واتساب
                    </a>
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* Step 5: المراجعة */}
            {step === 4 && (
              <>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-bold">راجعي طلبك قبل التأكيد</h2>
                </div>

                {/* Products */}
                <div>
                  <p className="mb-2 text-sm font-bold">
                    المنتجات <span className="text-muted-foreground">({count})</span>
                  </p>
                  <div className="space-y-2 rounded-xl ring-1 ring-border/70 p-3">
                    {items.map((item) => (
                      <div key={item.skuId} className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.colorName ? `${item.colorName} — ` : ""}
                            {item.quantity} × {formatPrice(item.unitPrice)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="mb-2 text-sm font-bold">العنوان</p>
                  <div className="space-y-1.5 rounded-xl ring-1 ring-border/70 p-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">الاسم: </span>
                      {name.trim()}
                    </p>
                    <p>
                      <span className="text-muted-foreground">الهواتف: </span>
                      <span dir="ltr">
                        {phonePrimary} / {phoneSecondary}
                      </span>
                      <Badge variant="outline" className="ms-2 gap-1 border-emerald-600/40 text-emerald-700 dark:text-emerald-400">
                        <Smartphone className="h-3 w-3" />
                        واتساب: {WHATSAPP_LABELS[whatsappOn]}
                      </Badge>
                    </p>
                    <p>
                      <span className="text-muted-foreground">العنوان: </span>
                      {addressText.trim()}
                    </p>
                    <p>
                      <span className="text-muted-foreground">الدور: </span>
                      {floor.trim()}
                      <span className="mx-2 text-muted-foreground">—</span>
                      <span className="text-muted-foreground">الشقة: </span>
                      {apartment.trim()}
                    </p>
                    <p>
                      <span className="text-muted-foreground">المنطقة: </span>
                      {zone?.name ?? "—"} (شحن {formatPrice(shippingFee)})
                    </p>
                    {coords && (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        📍 ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
                      </p>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div>
                  <p className="mb-2 text-sm font-bold">ملخص الحساب</p>
                  <div className="space-y-2 rounded-xl ring-1 ring-border/70 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الإجمالي الفرعي</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {applied && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                        <span>
                          خصم {applied.percentage}% ({applied.code})
                        </span>
                        <span>- {formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رسوم التوصيل</span>
                      <span>{formatPrice(shippingFee)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-bold">الإجمالي (كاش عند الاستلام)</span>
                      <span className="text-lg font-bold text-primary">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  بتأكيد الطلب أنت توافقين على الدفع نقدًا عند الاستلام. سيتم إشعارك بقرار الفريق
                  بعد المراجعة.
                </p>
              </>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* ── Footer nav ── */}
      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="gap-1"
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </Button>

        <div className="flex-1 text-center text-xs text-muted-foreground">
          الخطوة {step + 1} من {STEPS.length}
        </div>

        {step < 4 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid[step]} className="gap-1">
            التالي
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={submitOrder}
            disabled={orderMutation.isPending}
            className="gap-2"
          >
            {orderMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ إرسال الطلب...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                تأكيد الطلب — {formatPrice(total)}
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
