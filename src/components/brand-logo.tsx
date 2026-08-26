import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** icon = الدائرة فقط | emblem = الدائرة مع كلمة Brilliant داخلها | lockup = الشعار الأفقي الكامل */
  variant?: "icon" | "emblem" | "lockup";
  className?: string;
  alt?: string;
}

/**
 * لوجو بريليانت الرسمي — نسخة ذهبية تعمل على الوضعين الفاتح والداكن.
 * الأصول مصدرها ملف هوية البراند (PDF) وتوجد في public/brand.
 */
export function BrandLogo({
  variant = "icon",
  className,
  alt = "لوجو بريليانت",
}: BrandLogoProps) {
  return (
    <img
      src={`/brand/${variant}-gold.png`}
      alt={alt}
      width={variant === "lockup" ? 240 : 120}
      height={variant === "lockup" ? 60 : 120}
      draggable={false}
      className={cn("select-none object-contain", className)}
    />
  );
}
