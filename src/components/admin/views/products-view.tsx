"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveRestore,
  Boxes,
  Image as ImageIcon,
  Link2,
  Package,
  PackageSearch,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AdminProductDTO, AdminSkuDTO, CategoryDTO } from "@/lib/types";
import { formatPrice } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Form row types ───

interface ColorRow {
  name: string;
  hex: string;
  quantity: string;
  threshold: string;
}

interface ExistingSkuRow {
  id: string;
  skuCode: string;
  name: string;
  hex: string;
  threshold: string;
  available: number;
  reserved: number;
  sold: number;
  isBase: boolean;
}

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  salePrice: string;
  categoryId: string; // "" = بدون قسم
  images: string[];
  attributes: { key: string; value: string }[];
  hasColors: boolean;
  colors: ColorRow[];
  baseQuantity: string;
  baseThreshold: string;
  existingSkus: ExistingSkuRow[];
  removedSkuIds: string[];
}

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  price: "",
  salePrice: "",
  categoryId: "",
  images: [],
  attributes: [],
  hasColors: false,
  colors: [],
  baseQuantity: "0",
  baseThreshold: "3",
  existingSkus: [],
  removedSkuIds: [],
};

function newColorRow(): ColorRow {
  return { name: "", hex: "#B8863B", quantity: "0", threshold: "3" };
}

function colorsCountLabel(n: number): string {
  if (n === 1) return "لون واحد";
  if (n === 2) return "لونان";
  return `${n} ألوان`;
}

// ─── Product form dialog ───

function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AdminProductDTO | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const isEdit = !!product;
  // Product previously created WITH colors (has at least one non-base SKU)
  const hasExistingColors = product?.skus?.some((s) => !s.isBase) ?? false;
  // Product previously created WITHOUT colors (single base SKU)
  const isBaseProduct = isEdit && !hasExistingColors;

  useEffect(() => {
    if (!open) return;
    setImageUrl("");
    if (product) {
      const skus: ExistingSkuRow[] = product.skus.map((s: AdminSkuDTO) => ({
        id: s.id,
        skuCode: s.skuCode,
        name: s.colorName ?? "",
        hex: s.colorHex ?? "#B8863B",
        threshold: String(s.lowStockThreshold),
        available: s.availableQty,
        reserved: s.reservedQty,
        sold: s.soldQty,
        isBase: s.isBase,
      }));
      setForm({
        name: product.name,
        description: product.description,
        price: String(product.price),
        salePrice: product.salePrice != null ? String(product.salePrice) : "",
        categoryId: product.categoryId ?? "",
        images: [...product.images],
        attributes: product.attributes.map((a) => ({ ...a })),
        hasColors: hasExistingColors,
        colors: [],
        baseQuantity: "0",
        baseThreshold: "3",
        existingSkus: skus,
        removedSkuIds: [],
      });
    } else {
      setForm(emptyForm);
    }
     
  }, [open, product]);

  const { data: categoriesData } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.admin.categories(),
    enabled: open,
  });
  const categories: (CategoryDTO & { isActive: boolean })[] =
    categoriesData?.categories ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const attributes = form.attributes
        .filter((a) => a.key.trim() && a.value.trim())
        .map((a) => ({ key: a.key.trim(), value: a.value.trim() }));
      const newColors = form.colors
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          hex: c.hex,
          quantity: Number(c.quantity) || 0,
          lowStockThreshold: Number(c.threshold) || 0,
        }));

      if (product) {
        return api.admin.updateProduct(product.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          salePrice: form.salePrice.trim() ? Number(form.salePrice) : null,
          categoryId: form.categoryId || null,
          images: form.images,
          attributes,
          status: product.status,
          skus: form.existingSkus.map((s) => ({
            id: s.id,
            name: s.name.trim(),
            hex: s.hex,
            lowStockThreshold: Number(s.threshold) || 0,
          })),
          newColors,
          removedSkuIds: form.removedSkuIds,
        });
      }

      return api.admin.createProduct({
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        salePrice: form.salePrice.trim() ? Number(form.salePrice) : null,
        categoryId: form.categoryId || null,
        images: form.images,
        attributes,
        colors: form.hasColors ? newColors : [],
        ...(form.hasColors
          ? {}
          : {
              baseQuantity: Number(form.baseQuantity) || 0,
              baseLowStockThreshold: Number(form.baseThreshold) || 0,
            }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      toast({ title: product ? "تم تحديث المنتج بنجاح" : "تم إنشاء المنتج بنجاح" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  // ── Images helpers ──
  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await api.admin.upload(file);
      setForm((f) => ({ ...f, images: [...f.images, url] }));
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

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    setForm((f) => ({ ...f, images: [...f.images, url] }));
    setImageUrl("");
  };

  const removeImage = (index: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  // ── Attributes helpers ──
  const addAttribute = () =>
    setForm((f) => ({ ...f, attributes: [...f.attributes, { key: "", value: "" }] }));
  const updateAttribute = (index: number, field: "key" | "value", value: string) =>
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }));
  const removeAttribute = (index: number) =>
    setForm((f) => ({ ...f, attributes: f.attributes.filter((_, i) => i !== index) }));

  // ── Colors helpers ──
  const addColor = () =>
    setForm((f) => ({ ...f, colors: [...f.colors, newColorRow()] }));
  const updateColor = (index: number, patch: Partial<ColorRow>) =>
    setForm((f) => ({
      ...f,
      colors: f.colors.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  const removeColor = (index: number) =>
    setForm((f) => ({ ...f, colors: f.colors.filter((_, i) => i !== index) }));

  const updateExistingSku = (id: string, patch: Partial<ExistingSkuRow>) =>
    setForm((f) => ({
      ...f,
      existingSkus: f.existingSkus.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const markSkuRemoved = (sku: ExistingSkuRow) =>
    setForm((f) => ({
      ...f,
      existingSkus: f.existingSkus.filter((s) => s.id !== sku.id),
      removedSkuIds: [...f.removedSkuIds, sku.id],
    }));

  // ── Submit ──
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "أدخلي اسم المنتج", variant: "destructive" });
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      toast({ title: "أدخلي سعرًا صحيحًا للمنتج", variant: "destructive" });
      return;
    }
    if (form.salePrice.trim() && Number(form.salePrice) >= Number(form.price)) {
      toast({
        title: "سعر الخصم يجب أن يكون أقل من السعر الأساسي",
        variant: "destructive",
      });
      return;
    }
    if (!product && form.hasColors && form.colors.filter((c) => c.name.trim()).length === 0) {
      toast({
        title: "أضيفي لونًا واحدًا على الأقل",
        description: "أو أوقفي خيار «منتج بألوان متعددة»",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="font-display">
            {product ? `تعديل المنتج — ${product.name}` : "إضافة منتج جديد"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "تعديل بيانات المنتج وصوره وألوانه — الكميات تعدَّل من صفحة المخزون"
              : "اللون هو المتغير الوحيد للمنتج — كل لون له مخزون مستقل"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          {/* ── Basic info ── */}
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-name">اسم المنتج *</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثل: أحمر شفاه مخملي"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>القسم</Label>
                <Select
                  value={form.categoryId || "none"}
                  onValueChange={(v) => setForm({ ...form, categoryId: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختري القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قسم</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc">الوصف</Label>
              <Textarea
                id="p-desc"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="وصف تفصيلي يظهر في صفحة المنتج"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-price">السعر (ج.م) *</Label>
                <Input
                  id="p-price"
                  type="number"
                  min={0}
                  step="0.01"
                  dir="ltr"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="350"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-sale">سعر الخصم (اختياري)</Label>
                <Input
                  id="p-sale"
                  type="number"
                  min={0}
                  step="0.01"
                  dir="ltr"
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                  placeholder="اتركيه فارغًا لعدم الخصم"
                />
                {form.salePrice.trim() && form.price && Number(form.salePrice) < Number(form.price) && (
                  <p className="text-xs text-primary">
                    خصم {Math.round((1 - Number(form.salePrice) / Number(form.price)) * 100)}%
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Images manager ── */}
          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">صور المنتج</h3>
              <span className="text-xs text-muted-foreground">
                أول صورة هي الرئيسية ({form.images.length})
              </span>
            </div>

            {form.images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {form.images.map((img, i) => (
                  <div key={`${img}-${i}`} className="relative">
                    { }
                    <img
                      src={img}
                      alt={`صورة ${i + 1}`}
                      className="h-24 w-24 rounded-lg border border-border object-cover"
                    />
                    {i === 0 && (
                      <Badge className="absolute right-1 top-1 h-5 px-1.5 text-[10px]">
                        رئيسية
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={`حذف الصورة ${i + 1}`}
                      className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm transition-colors hover:bg-destructive hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
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
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="أو أضيفي رابط صورة https://..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="إضافة الصورة بالرابط"
                  disabled={!imageUrl.trim()}
                  onClick={addImageUrl}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* ── Custom attributes ── */}
          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">خصائص إضافية</h3>
              <span className="text-xs text-muted-foreground">
                مثل: الحجم، نوع البشرة، بلد المنشأ
              </span>
            </div>
            {form.attributes.length === 0 ? (
              <p className="text-xs text-muted-foreground">لم تُضف خصائص بعد (اختياري)</p>
            ) : (
              <div className="space-y-2">
                {form.attributes.map((attr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={attr.key}
                      onChange={(e) => updateAttribute(i, "key", e.target.value)}
                      placeholder="الخاصية (مثل: الحجم)"
                      className="flex-1"
                    />
                    <Input
                      value={attr.value}
                      onChange={(e) => updateAttribute(i, "value", e.target.value)}
                      placeholder="القيمة (مثل: 50 مل)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="حذف الخاصية"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeAttribute(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addAttribute}>
              <Plus className="h-3.5 w-3.5" />
              إضافة خاصية
            </Button>
          </section>

          {/* ── Colors / SKUs ── */}
          <section className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-sm font-bold">
                  الألوان والمخزون (SKU)
                </h3>
                <p className="text-xs text-muted-foreground">
                  كل لون = صنف مستقل بكوده ومخزونه الخاص
                </p>
              </div>
              {!isEdit && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="has-colors" className="text-xs font-medium">
                    منتج بألوان متعددة
                  </Label>
                  <Switch
                    id="has-colors"
                    checked={form.hasColors}
                    onCheckedChange={(v) => setForm({ ...form, hasColors: v })}
                  />
                </div>
              )}
            </div>

            {/* EDIT — existing colored SKUs table */}
            {isEdit && hasExistingColors && (
              <div className="space-y-2">
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">كود SKU</TableHead>
                        <TableHead className="text-right">اسم اللون</TableHead>
                        <TableHead className="text-right">اللون</TableHead>
                        <TableHead className="text-right">حد التنبيه</TableHead>
                        <TableHead className="text-right">المتاح / محجوز / مباع</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.existingSkus.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell dir="ltr" className="font-mono text-xs">
                            {s.skuCode}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={s.name}
                              onChange={(e) => updateExistingSku(s.id, { name: e.target.value })}
                              className="h-8 w-32"
                              placeholder="اسم اللون"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={s.hex}
                                onChange={(e) => updateExistingSku(s.id, { hex: e.target.value })}
                                aria-label={`لون ${s.name || s.skuCode}`}
                                className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                              />
                              <span dir="ltr" className="font-mono text-[10px] text-muted-foreground">
                                {s.hex}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              dir="ltr"
                              value={s.threshold}
                              onChange={(e) => updateExistingSku(s.id, { threshold: e.target.value })}
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold tabular-nums">{s.available}</span>
                            <span className="text-muted-foreground"> / {s.reserved} / {s.sold}</span>
                          </TableCell>
                          <TableCell>
                            {s.reserved > 0 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled
                                      aria-label="لا يمكن حذف لون محجوز"
                                      className="text-muted-foreground/40"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>لا يمكن حذف لون محجوز</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="حذف اللون"
                                className="text-destructive hover:text-destructive"
                                onClick={() => markSkuRemoved(s)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  تعدّل الكميات من صفحة المخزون — هنا تعدَّل بيانات اللون وحد التنبيه فقط.
                </p>
              </div>
            )}

            {/* EDIT — single base SKU info */}
            {isBaseProduct && form.existingSkus[0] && (
              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                    SKU: {form.existingSkus[0].skuCode}
                  </span>
                  <span>
                    المتاح:{" "}
                    <span className="font-bold tabular-nums">{form.existingSkus[0].available}</span>
                  </span>
                  <span className="text-muted-foreground">
                    محجوز: {form.existingSkus[0].reserved}
                  </span>
                  <span className="text-muted-foreground">
                    مباع: {form.existingSkus[0].sold}
                  </span>
                </div>
                <div className="max-w-40 space-y-1.5">
                  <Label htmlFor="base-threshold-edit" className="text-xs">
                    حد تنبيه المخزون المنخفض
                  </Label>
                  <Input
                    id="base-threshold-edit"
                    type="number"
                    min={0}
                    dir="ltr"
                    value={form.existingSkus[0].threshold}
                    onChange={(e) =>
                      updateExistingSku(form.existingSkus[0].id, { threshold: e.target.value })
                    }
                    className="h-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  منتج بدون ألوان (صنف أساسي واحد) — تعدَّل الكميات من صفحة المخزون.
                </p>
              </div>
            )}

            {/* Color rows editor — CREATE mode (switch ON) or EDIT mode (add new colors) */}
            {(!isEdit && form.hasColors) || (isEdit && hasExistingColors) ? (
              <div className="space-y-2">
                {isEdit && (
                  <p className="text-xs font-medium text-primary">إضافة لون جديد</p>
                )}
                {form.colors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {isEdit ? "لا توجد ألوان جديدة — أضيفي لونًا أدناه عند الحاجة" : "أضيفي ألوان المنتج واحدة تلو الأخرى"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.colors.map((color, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-2.5"
                      >
                        <div className="min-w-32 flex-1 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">اسم اللون</Label>
                          <Input
                            value={color.name}
                            onChange={(e) => updateColor(i, { name: e.target.value })}
                            placeholder="مثل: أحمر كلاسيك"
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">اللون</Label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={color.hex}
                              onChange={(e) => updateColor(i, { hex: e.target.value })}
                              aria-label="لون المنتج"
                              className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                            />
                            <span dir="ltr" className="font-mono text-[10px] text-muted-foreground">
                              {color.hex}
                            </span>
                          </div>
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">الكمية</Label>
                          <Input
                            type="number"
                            min={0}
                            dir="ltr"
                            value={color.quantity}
                            onChange={(e) => updateColor(i, { quantity: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">حد التنبيه</Label>
                          <Input
                            type="number"
                            min={0}
                            dir="ltr"
                            value={color.threshold}
                            onChange={(e) => updateColor(i, { threshold: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="حذف اللون"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeColor(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addColor}>
                  <Plus className="h-3.5 w-3.5" />
                  {isEdit ? "إضافة لون جديد" : "إضافة لون"}
                </Button>
              </div>
            ) : null}

            {/* CREATE mode — base quantity/threshold (switch OFF) */}
            {!isEdit && !form.hasColors && (
              <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:max-w-md sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-base-qty">الكمية الابتدائية</Label>
                  <Input
                    id="p-base-qty"
                    type="number"
                    min={0}
                    dir="ltr"
                    value={form.baseQuantity}
                    onChange={(e) => setForm({ ...form, baseQuantity: e.target.value })}
                    placeholder="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-base-threshold">حد تنبيه المخزون المنخفض</Label>
                  <Input
                    id="p-base-threshold"
                    type="number"
                    min={0}
                    dir="ltr"
                    value={form.baseThreshold}
                    onChange={(e) => setForm({ ...form, baseThreshold: e.target.value })}
                    placeholder="3"
                  />
                </div>
              </div>
            )}
          </section>

          <DialogFooter className="sticky bottom-0 bg-card/95 pt-2 backdrop-blur">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? "جارٍ الحفظ..."
                : product
                  ? "حفظ التعديلات"
                  : "إنشاء المنتج"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main view ───

export default function ProductsAdminView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Toolbar state (debounced search)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "ACTIVE" | "ARCHIVED">("all");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Dialogs state
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProductDTO | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<AdminProductDTO | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", search, status],
    queryFn: () =>
      api.admin.products({
        search: search || undefined,
        status: status === "all" ? undefined : status,
      }),
  });
  const products: AdminProductDTO[] = data?.products ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  const archiveMutation = useMutation({
    mutationFn: async (p: AdminProductDTO) => api.admin.deleteProduct(p.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "تم أرشفة المنتج", description: "يمكن استعادته في أي وقت" });
      setConfirmTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (p: AdminProductDTO) =>
      api.admin.updateProduct(p.id, { status: "ACTIVE" }),
    onSuccess: () => {
      invalidate();
      toast({ title: "تم استعادة المنتج", description: "أصبح ظاهرًا في المتجر" });
      setConfirmTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEdit = (p: AdminProductDTO) => {
    setEditingProduct(p);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">إدارة المنتجات</h1>
          <p className="text-sm text-muted-foreground">
            المنتجات وألوانها وصورها وأسعارها
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة منتج
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <PackageSearch className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="بحث بالاسم..."
            className="pr-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="ACTIVE">مفعّل</SelectItem>
            <SelectItem value="ARCHIVED">مؤرشف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products table */}
      <div className="bg-card rounded-2xl border border-border">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Package className="h-12 w-12 opacity-40" />
            <p className="text-sm">
              {search || status !== "all"
                ? "لا توجد منتجات مطابقة للبحث أو الفلتر"
                : "لا توجد منتجات بعد — أضيفي أول منتج للمتجر"}
            </p>
            {!search && status === "all" && (
              <Button onClick={openCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة منتج
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">المخزون (SKU)</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const colorSkus = p.skus.filter((s) => !s.isBase);
                  const totalAvailable = p.skus.reduce((sum, s) => sum + s.availableQty, 0);
                  const discount =
                    p.salePrice != null && p.price > p.salePrice
                      ? Math.round((1 - p.salePrice / p.price) * 100)
                      : 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                             
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
                            />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-48 truncate font-medium" title={p.name}>
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.categoryName ?? "بدون قسم"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.salePrice != null ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(p.price)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="font-semibold text-primary">
                                {formatPrice(p.salePrice)}
                              </span>
                              {discount > 0 && (
                                <Badge className="h-5 px-1.5 text-[10px] tabular-nums">
                                  {discount}%-
                                </Badge>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold">{formatPrice(p.price)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {colorSkus.length > 0 ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Boxes className="h-3.5 w-3.5 text-primary" />
                            {colorsCountLabel(colorSkus.length)} — متاح {totalAvailable}
                          </span>
                        ) : (
                          <span className="text-sm">
                            متاح{" "}
                            <span className="font-semibold tabular-nums">{totalAvailable}</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.status === "ACTIVE" ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          >
                            مفعّل
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/30">
                            مؤرشف
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(p)}
                            aria-label="تعديل المنتج"
                            className="text-primary hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {p.status === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmTarget(p)}
                              aria-label="أرشفة المنتج"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmTarget(p)}
                              aria-label="استعادة المنتج"
                              className="text-emerald-600 hover:text-emerald-600"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Product form dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
      />

      {/* Archive / restore confirm */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.status === "ACTIVE"
                ? `أرشفة «${confirmTarget?.name}»؟`
                : `استعادة «${confirmTarget?.name}»؟`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.status === "ACTIVE"
                ? "سيختفي المنتج من المتجر ولن يتمكن العملاء من رؤيته أو شرائه. يمكن استعادته لاحقًا دون فقدان أي بيانات."
                : "سيعود المنتج للظهور في المتجر بحالته ومخزونه الحالي."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmTarget?.status === "ACTIVE"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : ""
              }
              onClick={() => {
                if (!confirmTarget) return;
                if (confirmTarget.status === "ACTIVE") archiveMutation.mutate(confirmTarget);
                else restoreMutation.mutate(confirmTarget);
              }}
            >
              {confirmTarget?.status === "ACTIVE" ? "أرشفة" : "استعادة"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
