import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { SITE_URL } from "@/lib/seo";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

const Analytics = dynamic(() => import("@vercel/analytics/next").then(m => m.Analytics));
const PageViewTracker = dynamic(() => import("@/components/layout/PageViewTracker").then(m => m.PageViewTracker));
const Swing2AppBridge = dynamic(() => import("@/components/layout/Swing2AppBridge").then(m => m.Swing2AppBridge));

const SITE_NAME = "타투어때";
const SITE_TITLE = "타투어때 - 타투 가격비교 & 타투이스트 추천 | 대한민국 1등 타투 플랫폼";
const SITE_DESCRIPTION = "타투 잘하는 곳 찾을 땐 타투어때! 전국 타투샵 가격비교, 타투이스트 포트폴리오, 반영구·레터링·감성타투까지. 200만 회원이 선택한 대한민국 최대 타투 플랫폼.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["타투", "타투 가격", "타투 추천", "타투샵", "타투이스트", "반영구", "레터링 타투", "감성 타투", "타투 잘하는 곳", "타투어때", "tattoo", "tattoo artist"],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
        type: "image/png",
      },
    ],
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? "",
    other: {
      "naver-site-verification": "c3b015bc3b2ac006c876211db77da87f031b5881",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://bhcascuuecgwlxujtpkx.supabase.co" />
        <link rel="dns-prefetch" href="https://bhcascuuecgwlxujtpkx.supabase.co" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(location.pathname.includes("reset-password"))return;var h=location.hash;if(h.includes("type=recovery"))location.replace("/reset-password"+h);else if(h.includes("error=")&&h.includes("otp_expired"))location.replace("/reset-password?error=link_expired")}())` }} />
      </head>

      <body
        className="font-sans"
      >
        <ThemeProvider>{children}</ThemeProvider>
        <PageViewTracker />
        <Swing2AppBridge />
        <Analytics />
      </body>
    </html>
  );
}
