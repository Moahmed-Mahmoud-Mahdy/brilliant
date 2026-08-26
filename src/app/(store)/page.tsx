import HomeView from "@/components/store/views/home-view";

export const metadata = {
  title: "بريليانت — فخامة تليق بكِ",
  description:
    "اكتشفي مجموعتنا المختارة من مستحضرات العناية والتجميل الأصلية مع توصيل داخل القاهرة والجيزة والدفع عند الاستلام.",
};

export default function HomePage() {
  return <HomeView />;
}
