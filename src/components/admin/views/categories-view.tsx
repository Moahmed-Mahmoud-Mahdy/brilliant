"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Boxes, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CategoryDTO } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { CategoryIcon, CATEGORY_ICONS_LIST } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

type AdminCategory = CategoryDTO & { isActive: boolean };

interface CategoryForm {
  name: string;
  description: string;
  image: string;
  isActive: boolean;
}

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  image: "Sparkles",
  isActive: true,
};

export default function CategoriesView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.admin.categories(),
  });
  const categories: AdminCategory[] = data?.categories ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        image: form.image || null,
        isActive: form.isActive,
      };
      if (editing) return api.admin.updateCategory(editing.id, body);
      return api.admin.createCategory(body);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: editing ? "تم تحديث القسم" : "تم إنشاء القسم بنجاح" });
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (cat: AdminCategory) =>
      api.admin.updateCategory(cat.id, { isActive: !cat.isActive }),
    onSuccess: (_data, cat) => {
      invalidate();
      toast({
        title: cat.isActive ? "تم تعطيل القسم" : "تم تفعيل القسم",
        description: cat.isActive
          ? "لن يظهر القسم للعملاء في المتجر"
          : "سيظهر القسم للعملاء في المتجر",
      });
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.admin.deleteCategory(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "تم حذف القسم" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (cat: AdminCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description ?? "",
      image: cat.image ?? "Sparkles",
      isActive: cat.isActive,
    });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "أدخلي اسم القسم", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">إدارة الأقسام</h1>
          <p className="text-sm text-muted-foreground">
            تنظيم منتجات المتجر في أقسام تظهر للعملاء
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة قسم
        </Button>
      </div>

      {/* Table card */}
      <div className="bg-card rounded-2xl border border-border">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Boxes className="h-12 w-12 opacity-40" />
            <p className="text-sm">لا توجد أقسام بعد — أضيفي أول قسم للمتجر</p>
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة قسم
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">عدد المنتجات</TableHead>
                  <TableHead className="text-right">مفعّل</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary">
                          <CategoryIcon name={cat.image} className="h-4 w-4" />
                        </span>
                        <span>{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground" title={cat.description ?? ""}>
                      {cat.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cat.productCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={cat.isActive}
                        onCheckedChange={() => toggleMutation.mutate(cat)}
                        disabled={toggleMutation.isPending && toggleMutation.variables?.id === cat.id}
                        aria-label={`تفعيل قسم ${cat.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(cat)}
                          aria-label="تعديل القسم"
                          className="text-primary hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {cat.productCount === 0 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(cat)}
                            aria-label="حذف القسم"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled
                                  aria-label="حذف القسم غير متاح"
                                  className="text-muted-foreground/40"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>انقلي المنتجات أولًا أو عطّلي القسم</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "تعديل القسم" : "إضافة قسم جديد"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "تعديل بيانات القسم ومدى ظهوره للعملاء"
                : "أنشئي قسمًا جديدًا لتنظيم المنتجات واختاري الأيقونة المناسبة"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">اسم القسم</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثل: العناية بالبشرة"
                required
              />
            </div>

            {/* Icon Selector */}
            <div className="space-y-2">
              <Label>أيقونة القسم</Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 rounded-xl border border-border bg-accent/30 p-2.5 max-h-52 overflow-y-auto scrollbar-thin">
                {CATEGORY_ICONS_LIST.map(({ key, label, Icon }) => {
                  const isSelected = form.image === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setForm({ ...form, image: key })}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg p-2 transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary"
                          : "bg-card text-muted-foreground hover:bg-card/80 hover:text-foreground border border-border/50"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] truncate max-w-full text-center">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-desc">الوصف</Label>
              <Textarea
                id="cat-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="وصف مختصر يظهر مع القسم (اختياري)"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">مفعّل للعملاء</p>
                <p className="text-xs text-muted-foreground">
                  القسم غير المفعّل لا يظهر في المتجر
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                aria-label="تفعيل القسم"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء القسم"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القسم «{deleteTarget?.name}»؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. القسم فارغ حاليًا ولن تتأثر أي منتجات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
