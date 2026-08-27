import React from "react";
import {
  Sparkles,
  Brush,
  Scissors,
  Flower2,
  Droplets,
  Gift,
  Heart,
  Crown,
  Palette,
  Gem,
  Smile,
  Sun,
  Zap,
  Flame,
  ShoppingBag,
  Tag,
  Boxes,
  Wand2,
  type LucideIcon,
} from "lucide-react";

export interface CategoryIconOption {
  key: string;
  label: string;
  Icon: LucideIcon;
}

export const CATEGORY_ICONS_LIST: CategoryIconOption[] = [
  { key: "Sparkles", label: "عناية وإشراق", Icon: Sparkles },
  { key: "Brush", label: "مكياج", Icon: Brush },
  { key: "Scissors", label: "شعر وتصفيف", Icon: Scissors },
  { key: "Flower2", label: "عطور وزهور", Icon: Flower2 },
  { key: "Droplets", label: "سيروم ومرطب", Icon: Droplets },
  { key: "Gift", label: "هدايا", Icon: Gift },
  { key: "Heart", label: "عناية خاصة", Icon: Heart },
  { key: "Crown", label: "فخامة وعروض", Icon: Crown },
  { key: "Palette", label: "ألوان ومكياج", Icon: Palette },
  { key: "Gem", label: "منتجات فاخرة", Icon: Gem },
  { key: "Smile", label: "عناية بالوجه", Icon: Smile },
  { key: "Sun", label: "حماية وصيف", Icon: Sun },
  { key: "Zap", label: "عروض سريعة", Icon: Zap },
  { key: "Flame", label: "الأكثر مبيعًا", Icon: Flame },
  { key: "ShoppingBag", label: "حقائب ومشتريات", Icon: ShoppingBag },
  { key: "Tag", label: "تخفيضات", Icon: Tag },
  { key: "Boxes", label: "قسم عام", Icon: Boxes },
  { key: "Wand2", label: "لمسات تجميل", Icon: Wand2 },
];

export const CATEGORY_ICONS_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICONS_LIST.map((item) => [item.key, item.Icon])
);

interface CategoryIconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name?: string | null;
  fallbackKey?: string;
  className?: string;
}

export function CategoryIcon({
  name,
  fallbackKey = "Sparkles",
  className = "h-5 w-5",
  ...props
}: CategoryIconProps) {
  if (name && (name.startsWith("http://") || name.startsWith("https://") || name.startsWith("/"))) {
    return <img src={name} alt="Category icon" className={className} />;
  }

  const IconComponent =
    (name && CATEGORY_ICONS_MAP[name]) ||
    CATEGORY_ICONS_MAP[fallbackKey] ||
    Boxes;

  return <IconComponent className={className} {...props} />;
}
