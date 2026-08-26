"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Image as ImageIcon,
  Link2,
  Pencil,
  Plus,
  Ticket,
  Trash2,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import type { BannerDTO } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AdminBanner = BannerDTO & { isActive: boolean; sortOrder: number };
type AdminCode = {
  id: string;
  code: string;
  percentage: number;
  expiresAt: string | null;
  isActive: boolean;
};

interface BannerForm {
  title: string;
  subtitle: string;
  image: string;
  sortOrder: string;
  isActive: boolean;
}

interface CodeForm {
  code: string;
  percentage: string;
  expiresAt: string;
  isActive: boolean;
}

const emptyBanner: BannerForm = {
  title: "",
  subtitle: "",
  image: "",
  sortOrder: "0",
  isActive: true,
};

const emptyCode: CodeForm = { code: "", percentage: "", expiresAt: "", isActive: true };

// ─── Shared image upload field ───
function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await api.admin.upload(file);
      onChange(url);
      toast({ title: "تم رفع الصورة" });
    } catch (err) {
      toast({
        title: "فشل رفع الصورة",
        description: err instanceof Error ? err.message : "حاولي مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4 text-primary" />
          {uploading ? "جارٍ الرفع..." : "رفع صورة"}
        </Button>
        <div className="flex flex-1 items-center gap-2">
          <Input
            dir="ltr"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="أو أضيفي رابط صورة مباشر https://..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="إضافة الصورة بالرابط"
            disabled={!urlInput.trim()}
            onClick={() => {
              onChange(urlInput.trim());
              setUrlInput("");
            }}
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {value && (
        <div className="relative w-fit">
          { }
          <img
            src={value}
            alt="معاينة البانر"
            className="h-32 w-full max-w-sm rounded-xl border border-border object-cover"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute left-2 top-2 h-7 w-7 rounded-full shadow-md"
            aria-label="إزالة الصورة"
            onClick={() => onChange("")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function OffersView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Banners state ──
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminBanner | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBanner);
  const [deleteBanner, setDeleteBanner] = useState<AdminBanner | null>(null);

  // ── Codes state ──
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<AdminCode | null>(null);
  const [codeForm, setCodeForm] = useState<CodeForm>(emptyCode);
  const [deleteCode, setDeleteCode] = useState<AdminCode | null>(null);

  const bannersQuery = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => api.admin.banners(),
  });
  const banners: AdminBanner[] = bannersQuery.data?.banners ?? [];

  const codesQuery = useQuery({
    queryKey: ["admin-discount-codes"],
    queryFn: () => api.admin.discountCodes(),
  });
  const codes: AdminCode[] = codesQuery.data?.codes ?? [];

  const invalidateBanners = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
  const invalidateCodes = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-discount-codes"] });

  // ── Banner mutations ──
  const saveBannerMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim() || null,
        image: bannerForm.image.trim(),
        sortOrder: Number(bannerForm.sortOrder) || 0,
        isActive: bannerForm.isActive,
      };
      if (editingBanner) return api.admin.updateBanner(editingBanner.id, body);
      return api.admin.createBanner(body);
    },
    onSuccess: () => {
      invalidateBanners();
      toast({ title: editingBanner ? "تم تحديث البانر" : "تم إنشاء البانر بنجاح" });
      setBannerDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const toggleBannerMutation = useMutation({
    mutationFn: async (banner: AdminBanner) =>
      api.admin.updateBanner(banner.id, { isActive: !banner.isActive }),
    onSuccess: (_d, banner) => {
      invalidateBanners();
      toast({
        title: banner.isActive ? "تم تعطيل البانر" : "تم تفعيل البانر",
        description: banner.isActive ? "لن يظهر في المتجر" : "سيظهر في المتجر",
      });
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => api.admin.deleteBanner(id),
    onSuccess: () => {
      invalidateBanners();
      toast({ title: "تم حذف البانر" });
      setDeleteBanner(null);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  // ── Code mutations ──
  const saveCodeMutation = useMutation({
    mutationFn: async () => {
      const body = {
        code: codeForm.code.trim().toUpperCase(),
        percentage: Number(codeForm.percentage),
        expiresAt: codeForm.expiresAt ? new Date(codeForm.expiresAt).toISOString() : null,
        isActive: codeForm.isActive,
      };
      if (editingCode) return api.admin.updateDiscountCode(editingCode.id, body);
      return api.admin.createDiscountCode(body);
    },
    onSuccess: () => {
      invalidateCodes();
      toast({ title: editingCode ? "تم تحديث كود الخصم" : "تم إنشاء كود الخصم بنجاح" });
      setCodeDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const toggleCodeMutation = useMutation({
    mutationFn: async (code: AdminCode) =>
      api.admin.updateDiscountCode(code.id, { isActive: !code.isActive }),
    onSuccess: (_d, code) => {
      invalidateCodes();
      toast({
        title: code.isActive ? "تم تعطيل الكود" : "تم تفعيل الكود",
        description: code.code,
      });
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteCodeMutation = useMutation({
    mutationFn: async (id: string) => api.admin.deleteDiscountCode(id),
    onSuccess: () => {
      invalidateCodes();
      toast({ title: "تم حذف كود الخصم" });
      setDeleteCode(null);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  // ── Banner dialog helpers ──
  const openBannerCreate = () => {
    setEditingBanner(null);
    setBannerForm(emptyBanner);
    setBannerDialogOpen(true);
  };
  const openBannerEdit = (b: AdminBanner) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      image: b.image,
      sortOrder: String(b.sortOrder),
      isActive: b.isActive,
    });
    setBannerDialogOpen(true);
  };
  const submitBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) {
      toast({ title: "أدخلي عنوان البانر", variant: "destructive" });
      return;
    }
    if (!bannerForm.image.trim()) {
      toast({ title: "أضيفي صورة للبانر", variant: "destructive" });
      return;
    }
    saveBannerMutation.mutate();
  };

  // ── Code dialog helpers ──
  const openCodeCreate = () => {
    setEditingCode(null);
    setCodeForm(emptyCode);
    setCodeDialogOpen(true);
  };
  const openCodeEdit = (c: AdminCode) => {
    setEditingCode(c);
    setCodeForm({
      code: c.code,
      percentage: String(c.percentage),
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      isActive: c.isActive,
    });
    setCodeDialogOpen(true);
  };
  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(codeForm.percentage);
    if (!codeForm.code.trim()) {
      toast({ title: "أدخلي الكود", variant: "destructive" });
      return;
    }
    if (!pct || pct < 1 || pct > 100) {
      toast({ title: "النسبة يجب أن تكون بين 1 و 100", variant: "destructive" });
      return;
    }
    saveCodeMutation.mutate();
  };

  const isExpired = (c: AdminCode) =>
    !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div>
        <h1 className="font-display text-2xl font-bold">العروض</h1>
        <p className="text-sm text-muted-foreground">
          إدارة بانرات المتجر الرئيسية وأكواد الخصم
        </p>
      </div>

      <Tabs defaultValue="banners" className="gap-4">
        <TabsList>
          <TabsTrigger value="banners" className="gap-1.5">
            <ImageIcon className="h-4 w-4" />
            البانرات
          </TabsTrigger>
          <TabsTrigger value="codes" className="gap-1.5">
            <Ticket className="h-4 w-4" />
            أكواد الخصم
          </TabsTrigger>
        </TabsList>

        {/* ── Banners tab ── */}
        <TabsContent value="banners" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              البانرات تظهر أعلى الصفحة الرئيسية حسب الترتيب
            </p>
            <Button onClick={openBannerCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة بانر
            </Button>
          </div>

          {bannersQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-2xl" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-muted-foreground">
              <ImageIcon className="h-12 w-12 opacity-40" />
              <p className="text-sm">لا توجد بانرات بعد — أضيفي أول بانر للمتجر</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="relative h-40 w-full bg-muted">
                    { }
                    <img
                      src={b.image}
                      alt={b.title}
                      className="h-full w-full object-cover"
                    />
                    <Badge
                      variant="outline"
                      className="absolute right-2 top-2 border-primary/40 bg-background/80 backdrop-blur"
                    >
                      ترتيب: {b.sortOrder}
                    </Badge>
                    {!b.isActive && (
                      <Badge
                        variant="outline"
                        className="absolute left-2 top-2 bg-background/80 text-muted-foreground backdrop-blur"
                      >
                        معطّل
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <h3 className="font-display font-bold">{b.title}</h3>
                    {b.subtitle && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {b.subtitle}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={b.isActive}
                          onCheckedChange={() => toggleBannerMutation.mutate(b)}
                          aria-label={`تفعيل بانر ${b.title}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {b.isActive ? "ظاهر" : "مخفي"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openBannerEdit(b)}
                          aria-label="تعديل البانر"
                          className="text-primary hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteBanner(b)}
                          aria-label="حذف البانر"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Codes tab ── */}
        <TabsContent value="codes" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              أكواد نسبة خصم تُطبَّق على إجمالي المنتجات عند الدفع
            </p>
            <Button onClick={openCodeCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة كود
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card">
            {codesQuery.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : codes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Ticket className="h-12 w-12 opacity-40" />
                <p className="text-sm">لا توجد أكواد خصم بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الكود</TableHead>
                      <TableHead className="text-right">نسبة الخصم</TableHead>
                      <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                      <TableHead className="text-right">مفعّل</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <span
                            dir="ltr"
                            className="font-mono text-sm font-bold text-primary"
                          >
                            {c.code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-semibold tabular-nums">
                            {c.percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.expiresAt ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                              {new Date(c.expiresAt).toLocaleDateString("ar-EG")}
                              {isExpired(c) && (
                                <Badge
                                  variant="outline"
                                  className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                                >
                                  منتهية
                                </Badge>
                              )}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">بدون انتهاء</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={c.isActive}
                            onCheckedChange={() => toggleCodeMutation.mutate(c)}
                            aria-label={`تفعيل كود ${c.code}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openCodeEdit(c)}
                              aria-label="تعديل الكود"
                              className="text-primary hover:text-primary"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteCode(c)}
                              aria-label="حذف الكود"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* ── Banner dialog ── */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingBanner ? "تعديل البانر" : "إضافة بانر جديد"}
            </DialogTitle>
            <DialogDescription>
              البانر يظهر في أعلى الصفحة الرئيسية للعملاء
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBanner} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banner-title">العنوان</Label>
              <Input
                id="banner-title"
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                placeholder="مثل: تشكيلة الشتاء الجديدة"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-subtitle">العنوان الفرعي</Label>
              <Input
                id="banner-subtitle"
                value={bannerForm.subtitle}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                placeholder="سطر صغير أسفل العنوان (اختياري)"
              />
            </div>
            <div className="space-y-2">
              <Label>صورة البانر</Label>
              <ImageUploadField
                value={bannerForm.image}
                onChange={(url) => setBannerForm({ ...bannerForm, image: url })}
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="banner-order">الترتيب</Label>
                <Input
                  id="banner-order"
                  type="number"
                  dir="ltr"
                  value={bannerForm.sortOrder}
                  onChange={(e) => setBannerForm({ ...bannerForm, sortOrder: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
                <span className="text-sm font-medium">مفعّل</span>
                <Switch
                  checked={bannerForm.isActive}
                  onCheckedChange={(v) => setBannerForm({ ...bannerForm, isActive: v })}
                  aria-label="تفعيل البانر"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBannerDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saveBannerMutation.isPending}>
                {saveBannerMutation.isPending ? "جارٍ الحفظ..." : editingBanner ? "حفظ التعديلات" : "إنشاء البانر"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Code dialog ── */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingCode ? "تعديل كود الخصم" : "إضافة كود خصم"}
            </DialogTitle>
            <DialogDescription>
              نسبة خصم على إجمالي المنتجات — تُطبَّق عند إدخال الكود في السلة
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code-value">الكود</Label>
              <Input
                id="code-value"
                dir="ltr"
                value={codeForm.code}
                onChange={(e) =>
                  setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })
                }
                placeholder="WELCOME10"
                className="font-mono"
                required
              />
              <p className="text-xs text-muted-foreground">
                يُحوَّل تلقائيًا لأحرف كبيرة — يقبل الأحرف والأرقام
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code-pct">نسبة الخصم (%)</Label>
              <Input
                id="code-pct"
                type="number"
                min={1}
                max={100}
                dir="ltr"
                value={codeForm.percentage}
                onChange={(e) => setCodeForm({ ...codeForm, percentage: e.target.value })}
                placeholder="10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code-expiry">تاريخ الانتهاء (اختياري)</Label>
              <Input
                id="code-expiry"
                type="date"
                dir="ltr"
                value={codeForm.expiresAt}
                onChange={(e) => setCodeForm({ ...codeForm, expiresAt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                اتركيه فارغًا لكود دائم بدون انتهاء
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">مفعّل</p>
                <p className="text-xs text-muted-foreground">الكود المعطّل يرفضه المتجر</p>
              </div>
              <Switch
                checked={codeForm.isActive}
                onCheckedChange={(v) => setCodeForm({ ...codeForm, isActive: v })}
                aria-label="تفعيل الكود"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCodeDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saveCodeMutation.isPending}>
                {saveCodeMutation.isPending ? "جارٍ الحفظ..." : editingCode ? "حفظ التعديلات" : "إنشاء الكود"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <AlertDialog open={!!deleteBanner} onOpenChange={(open) => !open && setDeleteBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف البانر «{deleteBanner?.title}»؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُحذف البانر نهائيًا من الصفحة الرئيسية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteBanner && deleteBannerMutation.mutate(deleteBanner.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCode} onOpenChange={(open) => !open && setDeleteCode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكود «{deleteCode?.code}»؟</AlertDialogTitle>
            <AlertDialogDescription>
              لن يتمكن العملاء من استخدام هذا الكود بعد الحذف. الطلبات السابقة لن تتأثر.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteCode && deleteCodeMutation.mutate(deleteCode.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
