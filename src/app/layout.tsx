import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "صيدلية بحبح | Bahbah Pharmacy — ديروط، أسيوط",
  description:
    "صيدلية بحبح ديروط — أدوية أصلية، فيتامينات، عناية بالبشرة، مستلزمات الأم والطفل وأجهزة طبية، مع خدمة واصلي للتوصيل السريع ورعاية شهرية لأدويتك المزمنة.",
  keywords: [
    "صيدلية",
    "بحبح",
    "ديروط",
    "أسيوط",
    "أدوية",
    "واصلي",
    "pharmacy",
    "Bahbah",
    "Deirout",
    "Assiut",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/images/bahbah-badge.png",
    apple: "/images/bahbah-badge.png",
  },
  openGraph: {
    title: "صيدلية بحبح | Bahbah Pharmacy — ديروط، أسيوط",
    description:
      "صحتك أقرب مما تتخيل — واصلي يوصلك خلال 30 دقيقة في ديروط، وشحن لكل محافظات مصر",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#112D51",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@300;400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans antialiased bg-background text-foreground"
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
        {/* Cloudflare Pages PWA — offline-ready service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}
