"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Lock, ShieldCheck, UserCog } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BrandLogo } from "@/components/brand-logo";

export default function SettingsView() {
  const { toast } = useToast();
  const admin = useAdminStore((s) => s.admin);
  const setAdmin = useAdminStore((s) => s.setAdmin);

  // ── Name form ──
  // (admin is guaranteed loaded before the admin panel renders — the login
  //  gate in admin-app.tsx keeps this view unmounted until then)
  const [name, setName] = useState(admin?.name ?? "");

  // ── Password form ──
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const nameMutation = useMutation({
    mutationFn: async () => api.admin.updateProfile({ name: name.trim() }),
    onSuccess: (data) => {
      if (admin && data.admin) {
        setAdmin({ ...admin, name: data.admin.name });
      }
      toast({ title: "تم تحديث الاسم بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () =>
      api.admin.updateProfile({ password: password }),
    onSuccess: () => {
      setPassword("");
      setConfirmPassword("");
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "أدخلي الاسم الجديد", variant: "destructive" });
      return;
    }
    nameMutation.mutate();
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: "كلمة المرور قصيرة",
        description: "يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div>
        <h1 className="font-display text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">
          إدارة بيانات حسابك وحمايته
        </p>
      </div>

      {/* Current admin card */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex flex-wrap items-center gap-4">
          <BrandLogo variant="icon" className="h-14 w-14 shrink-0 drop-shadow-sm" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">{admin?.name}</h2>
            <p className="text-sm text-muted-foreground" dir="ltr">
              @{admin?.username}
            </p>
          </div>
          <Badge variant="outline" className="border-primary/50 text-primary">
            <ShieldCheck className="ml-1 h-3.5 w-3.5" />
            صلاحيات: وصول كامل
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Change name */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-bold">تغيير الاسم</h3>
          </div>
          <form onSubmit={submitName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">الاسم المعروض</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك كما يظهر في اللوحة"
                required
              />
              <p className="text-xs text-muted-foreground">
                يظهر الاسم في أعلى اللوحة وفي سجل النشاط
              </p>
            </div>
            <Button type="submit" disabled={nameMutation.isPending}>
              {nameMutation.isPending ? "جارٍ الحفظ..." : "حفظ الاسم"}
            </Button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-bold">تغيير كلمة المرور</h3>
          </div>
          <form onSubmit={submitPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-password">كلمة المرور الجديدة</Label>
              <Input
                id="settings-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={6}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-password-confirm">تأكيد كلمة المرور</Label>
              <Input
                id="settings-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                6 أحرف على الأقل — يجب تطابق الحقلين
              </p>
            </div>
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
            </Button>
          </form>
        </div>
      </div>

      {/* Security note */}
      <Alert className="border-primary/40 bg-primary/5">
        <Lock className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">ملاحظة أمنية</AlertTitle>
        <AlertDescription>
          كلمات المرور مشفّرة ولا يمكن استرجاعها — دعم استرجاع الحساب يتم يدويًا عبر واتساب.
        </AlertDescription>
      </Alert>
    </div>
  );
}
