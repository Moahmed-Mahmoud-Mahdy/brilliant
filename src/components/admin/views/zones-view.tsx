"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2, Info } from "lucide-react";
import { api } from "@/lib/api";
import type { ZoneDTO } from "@/lib/types";
import { formatPrice } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AdminZone = ZoneDTO & { isActive: boolean };

interface ZoneForm {
  name: string;
  shippingFee: string;
  isActive: boolean;
}

const emptyForm: ZoneForm = { name: "", shippingFee: "", isActive: true };

export default function ZonesView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<AdminZone | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-zones"],
    queryFn: () => api.admin.zones(),
  });
  const zones: AdminZone[] = data?.zones ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-zones"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        shippingFee: Number(form.shippingFee) || 0,
        isActive: form.isActive,
      };
      if (editing) return api.admin.updateZone(editing.id, body);
      return api.admin.createZone(body);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: editing ? "تم تحديث المنطقة" : "تم إضافة المنطقة بنجاح" });
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (zone: AdminZone) =>
      api.admin.updateZone(zone.id, { isActive: !zone.isActive }),
    onSuccess: (_data, zone) => {
      invalidate();
      toast({
        title: zone.isActive
          ? "تم تعطيل المنطقة — لن تظهر للعملاء"
          : "تم تفعيل المنطقة",
        description: zone.name,
      });
    },
    onError: (err: Error) => {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.admin.deleteZone(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "تم حذف المنطقة" });
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

  const openEdit = (zone: AdminZone) => {
    setEditing(zone);
    setForm({
      name: zone.name,
      shippingFee: String(zone.shippingFee),
      isActive: zone.isActive,
    });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "أدخلي اسم المنطقة", variant: "destructive" });
      return;
    }
    if (form.shippingFee === "" || Number(form.shippingFee) < 0) {
      toast({ title: "أدخلي رسوم توصيل صحيحة", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">مناطق التوصيل</h1>
          <p className="text-sm text-muted-foreground">
            إدارة مناطق التغطية ورسوم التوصيل لكل منطقة
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة منطقة
        </Button>
      </div>

      {/* Coverage note */}
      <Alert className="border-primary/40 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">نطاق التغطية</AlertTitle>
        <AlertDescription>
          التغطية الحالية: القاهرة والجيزة فقط — خارج النطاق يوجَّه العملاء لواتساب.
        </AlertDescription>
      </Alert>

      {/* Table card */}
      <div className="bg-card rounded-2xl border border-border">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <MapPin className="h-12 w-12 opacity-40" />
            <p className="text-sm">لا توجد مناطق توصيل بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المنطقة</TableHead>
                  <TableHead className="text-right">رسوم التوصيل</TableHead>
                  <TableHead className="text-right">مفعّلة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {zone.name}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatPrice(zone.shippingFee)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={zone.isActive}
                        onCheckedChange={() => toggleMutation.mutate(zone)}
                        disabled={toggleMutation.isPending && toggleMutation.variables?.id === zone.id}
                        aria-label={`تفعيل منطقة ${zone.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(zone)}
                          aria-label="تعديل المنطقة"
                          className="text-primary hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(zone)}
                          aria-label="حذف المنطقة"
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "تعديل المنطقة" : "إضافة منطقة توصيل"}
            </DialogTitle>
            <DialogDescription>
              حدّدي اسم المنطقة ورسوم التوصيل المطبَّقة عليها
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zone-name">اسم المنطقة</Label>
              <Input
                id="zone-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثل: مدينة نصر — القاهرة"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-fee">رسوم التوصيل (ج.م)</Label>
              <Input
                id="zone-fee"
                type="number"
                min={0}
                step="1"
                dir="ltr"
                value={form.shippingFee}
                onChange={(e) => setForm({ ...form, shippingFee: e.target.value })}
                placeholder="30"
                required
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">مفعّلة للعملاء</p>
                <p className="text-xs text-muted-foreground">
                  المنطقة غير المفعّلة لن تظهر في خيارات الشحن
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                aria-label="تفعيل المنطقة"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة المنطقة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف منطقة «{deleteTarget?.name}»؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المنطقة نهائيًا من خيارات التوصيل. الطلبات السابقة لن تتأثر.
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
