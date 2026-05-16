import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

const Analytics = dynamic(() => import("@vercel/analytics/next").then(m => m.Analytics));
const PageViewTracker = dynamic(() => import("@/components/layout/PageViewTracker").then(m => m.PageViewTracker));
const Swing2AppBridge = dynamic(() => import("@/components/layout/Swing2AppBridge").then(m => m.Swing2AppBridge));
const ServiceWorkerRegistration = dynamic(() => import("@/components/layout/ServiceWorkerRegistration").then(m => m.ServiceWorkerRegistration));

const SITE_NAME = "반언니";
const SITE_TITLE = "반언니 - 반영구 화장 가격비교 & 아티스트 추천 | 대한민국 1등 반영구 플랫폼";
const SITE_DESCRIPTION = "반영구 잘하는 곳 찾을 땐 반언니! 전국 반영구 아티스트 포트폴리오, 눈썹·입술·아이라인 가격비교. 나에게 맞는 반영구 아티스트를 찾아보세요.";

// 공개 준비 중에는 NEXT_PUBLIC_BLOCK_INDEXING=true → meta robots noindex + robots.ts disallow.
// 공개 시점에 Vercel env 에서 변수 제거(또는 false)로 전환. robots.ts 와 반드시 동기화.
const BLOCK_INDEXING = process.env.NEXT_PUBLIC_BLOCK_INDEXING === "true";

// Supabase 호스트 (preconnect/dns-prefetch 대상). env 기반이라 오타/교체 위험 없음.
const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://vzhvaweiyztbjaldnxdd.supabase.co").origin;
  } catch {
    return "https://vzhvaweiyztbjaldnxdd.supabase.co";
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["반영구", "반영구 화장", "눈썹 문신", "반영구 눈썹", "입술 반영구", "아이라인", "반영구 가격", "반영구 추천", "반언니"],
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
  robots: BLOCK_INDEXING
    ? {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
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
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={SUPABASE_HOST} />
        <link rel="dns-prefetch" href={SUPABASE_HOST} />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var h=location.hash;if(!h)return;if(location.pathname.indexOf("reset-password")>-1)return;if(h.indexOf("type=recovery")>-1)location.replace("/reset-password"+h);else if(h.indexOf("error=")>-1&&h.indexOf("otp_expired")>-1)location.replace("/reset-password?error=link_expired")}())` }} />
      </head>

      <body
        className="font-sans"
      >
        {children}
        <PageViewTracker />
        <Swing2AppBridge />
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  );
}
