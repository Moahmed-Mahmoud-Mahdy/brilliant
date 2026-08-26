import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { FloatingIcons } from "@/components/floating-icons";

// Shared chrome for all storefront pages (header + sticky footer + floating icons)
export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <FloatingIcons />
      <div className="relative z-10 flex min-h-screen flex-col">
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
      </div>
    </div>
  );
}
