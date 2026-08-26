import type { Metadata, Viewport } from "next";
import { Tajawal, El_Messiri } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";

const tajawal = Tajawal({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
});

const elMessiri = El_Messiri({
  variable: "--font-display",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

/** خط الثلث — لكلمة «بريليانت» كعلامة تجارية فقط */
const thuluth = localFont({
  src: "./fonts/KhatESulas.ttf",
  variable: "--font-thuluth",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "بريليانت | BRILLIANT — متجر العناية والتجميل",
    template: "%s | بريليانت",
  },
  description:
    "بريليانت — وجهتك الفاخرة لمنتجات العناية بالبشرة والتجميل. تسوقي أحمر الشفاه، السيروم، الكريمات والمزيد مع توصيل داخل القاهرة والجيزة والدفع عند الاستلام.",
  keywords: [
    "بريليانت",
    "BRILLIANT",
    "مستحضرات تجميل",
    "العناية بالبشرة",
    "مكياج",
    "متجر إلكتروني",
  ],
};

export const viewport: Viewport = {
  themeColor: "#B8863B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${tajawal.variable} ${elMessiri.variable} ${thuluth.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
