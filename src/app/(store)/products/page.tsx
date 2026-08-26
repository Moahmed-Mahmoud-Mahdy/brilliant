import { Suspense } from "react";
import ProductsView from "@/components/store/views/products-view";

export const metadata = {
  title: "المنتجات",
  description: "تصفحي كل منتجات بريليانت مع فلاتر البحث والسعر والتوفر.",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsView />
    </Suspense>
  );
}
