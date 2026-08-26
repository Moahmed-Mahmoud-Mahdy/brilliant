import type { Metadata } from "next";
import ProductView from "@/components/store/views/product-view";
import { db } from "@/lib/db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await db.product.findUnique({
      where: { id },
      select: { name: true },
    });
    if (product) {
      return {
        title: product.name,
        description: `${product.name} — من بريليانت، متجر العناية والتجميل.`,
      };
    }
  } catch {
    // ignore — fall through to default
  }
  return { title: "تفاصيل المنتج" };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductView productId={id} />;
}
