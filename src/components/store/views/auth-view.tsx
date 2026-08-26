"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useCartStore, useAuthStore } from "@/lib/store";
import { BrandLogo } from "@/components/brand-logo";

const PHONE_RE = /^01[0125][0-9]{8}$/;
const PHONE_ERROR = "أدخلي رقم هاتف مصري صحيح (11 رقم يبدأ بـ 01)";

export default function AuthView() {
  const setCustomer = useAuthStore((s) => s.setCustomer);
  const items = useCartStore((s) => s.items);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Login state ──
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // ── Register state ──
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const navigateAfter = (name: string) => {
    const redirectTo = searchParams.get("redirect");
    const target = redirectTo ?? (items.length > 0 ? "/checkout" : "/orders");
    router.push(target);
    toast({ title: `أهلاً بكِ ${name} 🌸`, duration: 3500 });
  };

  const loginMutation = useMutation({
    mutationFn: () =>
      api.auth.login({
        phone: loginPhone,
        password: loginPassword,
      }),
    onSuccess: (res) => {
      setCustomer(res.customer);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      navigateAfter(res.customer.name);
    },
    onError: (e) => {
      toast({
        title: "تعذر تسجيل الدخول",
        description: e instanceof Error ? e.message : "تأكدي من رقم الهاتف وكلمة المرور",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      api.auth.register({
        name: regName.trim(),
        phone: regPhone,
        password: regPassword,
      }),
    onSuccess: (res) => {
      setCustomer(res.customer);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      navigateAfter(res.customer.name);
    },
    onError: (e) => {
      toast({
        title: "تعذر إنشاء الحساب",
        description: e instanceof Error ? e.message : "حدث خطأ غير متوقع، حاولي مرة أخرى",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const loginValid = PHONE_RE.test(loginPhone) && loginPassword.length >= 6;
  const regValid =
    regName.trim().length >= 2 &&
    PHONE_RE.test(regPhone) &&
    regPassword.length >= 6 &&
    regPassword === regConfirm;

  return (
    <div className="pattern-lux min-h-[75vh] px-4 py-12 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-md"
      >
        <Card className="gold-border-card gap-5 rounded-2xl bg-card/95 p-6 shadow-lg backdrop-blur-sm md:p-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2 text-center">
            <BrandLogo variant="emblem" className="h-24 w-24 drop-shadow-sm" />
            <h1 className="font-brand text-3xl">
              <span className="text-gold-gradient">بريليانت</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              سجلي الدخول لمتابعة طلباتك والتسوق بسهولة
            </p>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="gap-1.5">
                <LogIn className="h-4 w-4" />
                تسجيل الدخول
              </TabsTrigger>
              <TabsTrigger value="register" className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                حساب جديد
              </TabsTrigger>
            </TabsList>

            {/* ── Login ── */}
            <TabsContent value="login" className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-phone">رقم الهاتف</Label>
                <Input
                  id="login-phone"
                  dir="ltr"
                  inputMode="numeric"
                  value={loginPhone}
                  onChange={(e) =>
                    setLoginPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))
                  }
                  placeholder="01xxxxxxxxx"
                  className="text-right"
                />
                {loginPhone.length === 11 && !PHONE_RE.test(loginPhone) && (
                  <p className="text-xs text-destructive">{PHONE_ERROR}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password">كلمة المرور</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {loginPassword.length > 0 && loginPassword.length < 6 && (
                  <p className="text-xs text-destructive">كلمة المرور 6 أحرف على الأقل</p>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => loginMutation.mutate()}
                disabled={!loginValid || loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    تسجيل الدخول
                  </>
                )}
              </Button>
            </TabsContent>

            {/* ── Register ── */}
            <TabsContent value="register" className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">الاسم بالكامل</Label>
                <Input
                  id="reg-name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="مثال: سارة أحمد"
                />
                {regName.length > 0 && regName.trim().length < 2 && (
                  <p className="text-xs text-destructive">أدخلي الاسم (حرفان على الأقل)</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-phone">رقم الهاتف</Label>
                <Input
                  id="reg-phone"
                  dir="ltr"
                  inputMode="numeric"
                  value={regPhone}
                  onChange={(e) =>
                    setRegPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))
                  }
                  placeholder="01xxxxxxxxx"
                  className="text-right"
                />
                {regPhone.length === 11 && !PHONE_RE.test(regPhone) && (
                  <p className="text-xs text-destructive">{PHONE_ERROR}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-password">كلمة المرور</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                />
                {regPassword.length > 0 && regPassword.length < 6 && (
                  <p className="text-xs text-destructive">كلمة المرور 6 أحرف على الأقل</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-confirm">تأكيد كلمة المرور</Label>
                <Input
                  id="reg-confirm"
                  type="password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  placeholder="أعيدي كتابة كلمة المرور"
                />
                {regConfirm.length > 0 && regConfirm !== regPassword && (
                  <p className="text-xs text-destructive">كلمتا المرور غير متطابقتين</p>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => registerMutation.mutate()}
                disabled={!regValid || registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ إنشاء الحساب...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    إنشاء الحساب
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>


        </Card>
      </motion.div>
    </div>
  );
}
