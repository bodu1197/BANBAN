import type { NextConfig } from "next";
import { resolve } from "node:path";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** 목록 경로 — 아래 리다이렉트 3개가 같은 값을 쓴다. */
const PORTFOLIOS_PATH = "/portfolios";

const nextConfig: NextConfig = {
  // Turbopack configuration
  turbopack: {
    root: __dirname,
  },

  env: {
    // 사이트맵 lastmod 의 기준 시각. 라우트 안에서 `new Date()` 를 부르면 그건 배포 시각이 아니라
    // **람다 콜드스타트 시각**이라, 내용이 그대로인데도 인스턴스가 뜰 때마다 전 URL 의 lastmod 가
    // 달라진다 — 구글이 lastmod 신호를 통째로 무시하게 만드는 바로 그 패턴이다.
    // 여기 값은 빌드 때 문자열로 인라인되므로 배포마다 한 번만 바뀐다.
    BUILD_TIME: new Date().toISOString(),
  },

  // (구 로케일 라우팅 시절의 skipTrailingSlashRedirect 는 제거했다 — 로케일이 사라진 뒤에는
  //  "/about/" 과 "/about" 이 둘 다 200 으로 응답해 같은 페이지의 주소가 두 개씩 생기기만 했다.)

  async headers() {
    // iamport/portone=결제, t1.daumcdn=우편번호, pcdn2.swing2app=앱브릿지, cdn.jsdelivr=외부CDN
    // supabase.co=DB/Storage/Auth, flagcdn=국기, googleusercontent/kakaocdn/pstatic=SNS아바타
    // api.openai=GPT, storage.googleapis=Supabase Edge Functions
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.iamport.kr https://*.portone.io https://t1.daumcdn.net https://pcdn2.swing2app.co.kr https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://flagcdn.com https://*.googleusercontent.com https://k.kakaocdn.net https://*.pstatic.net",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://*.iamport.kr https://*.portone.io https://cdn.jsdelivr.net https://storage.googleapis.com",
      "frame-src 'self' https://*.iamport.kr https://*.portone.io https://postcode.map.kakao.com https://t1.daumcdn.net",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), interest-cohort=()" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
        ],
      },
    ];
  },

  // 301 redirects: legacy multi-locale URLs → Korean-only root
  // Site is now Korean-only. Any /en, /ja, /zh, /ko traffic must permanently
  // redirect to the equivalent root path so external links and crawlers
  // collapse onto a single canonical URL set.
  async redirects() {
    return [
      // www → apex 영구 리다이렉트. 앱스토어/외부 표기가 www 를 쓰고 있어 같은 페이지가 두 호스트로
      // 200 응답했다(canonical 이 apex 를 가리켜 최악은 면했지만, 네이버는 둘을 별개 사이트로 취급한다).
      // `has.value` 는 정규식으로 컴파일되므로 점을 이스케이프해야 `wwwXbanunniYcom` 이 매칭되지 않는다.
      // /api 는 제외한다 — 외부 웹훅/앱브릿지가 www 로 POST 하면 리다이렉트에서 본문이 유실될 수 있다.
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host" as const, value: "www\\.banunni\\.com" }],
        destination: "https://banunni.com/:path",
        permanent: true,
      },
      // 포트폴리오 목록 페이지네이션을 쿼리 → 경로 세그먼트로 옮겼다(searchParams 를 읽으면 캐시 불가).
      // 이미 밖에 나가 있는 ?page=N 링크·색인을 새 경로로 합친다.
      {
        source: PORTFOLIOS_PATH,
        // `[2-9]\d*` 로 쓰면 10~19 페이지가 매칭되지 않아(첫 글자가 1) 그 URL 들이 리다이렉트 없이
        // 1페이지 내용을 서빙한다 — 현재 27페이지까지 있으므로 실제로 10개가 새고 있었다.
        has: [{ type: "query" as const, key: "page", value: "(?<n>[2-9]|[1-9]\\d+)" }],
        destination: `${PORTFOLIOS_PATH}/page/:n`,
        permanent: true,
      },
      // ?page=1 은 리다이렉트하지 않는다 — Next 는 원본 쿼리를 destination 에 그대로 붙이므로
      // /portfolios → /portfolios?page=1 무한 루프가 된다(실측). 어차피 이 페이지는 이제
      // searchParams 를 읽지 않아 1페이지를 렌더하고 canonical 이 /portfolios 를 가리킨다.
      // 크롤러가 유추하는 부모/1페이지 URL — 두면 중복·soft 404 가 된다.
      { source: `${PORTFOLIOS_PATH}/page`, destination: PORTFOLIOS_PATH, permanent: true },
      { source: `${PORTFOLIOS_PATH}/page/1`, destination: PORTFOLIOS_PATH, permanent: true },
      { source: "/en/:path*", destination: "/:path*", permanent: true },
      { source: "/ja/:path*", destination: "/:path*", permanent: true },
      { source: "/zh/:path*", destination: "/:path*", permanent: true },
      { source: "/ko/:path*", destination: "/:path*", permanent: true },
      { source: "/en",        destination: "/",       permanent: true },
      { source: "/ja",        destination: "/",       permanent: true },
      { source: "/zh",        destination: "/",       permanent: true },
      { source: "/ko",        destination: "/",       permanent: true },
    ];
  },

  // Image optimization for Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '/w20/**',  // 국기 아이콘만 — pathname 한정으로 SSRF 추가 방어
      },
      // SNS 로그인 사용자 avatar (user_metadata.avatar_url) — MyPageClient/Header 표시
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',  // Google profile photo (lh3/avatars/...)
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'k.kakaocdn.net',  // Kakao profile photo
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.pstatic.net',  // Naver (사용 시)
        pathname: '/**',
      },
    ],
    // Custom sizes tuned for homepage card widths at 2x DPR:
    // 160 (80px grid), 200 (100px event), 320 (130px sale), 480 (240px popular)
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 200, 256, 320, 384, 480, 720, 1024],
    // AVIF first for better compression (30% smaller than WebP)
    formats: ['image/avif', 'image/webp'],
    // Global quality for smaller payloads (component-level overrides still work)
    // ⚠️ 컴포넌트가 실제로 쓰는 값이 여기 없으면 그 이미지 요청은 400 이 되어 화면에서 사라진다(Next 16).
    // 새 quality 값을 쓸 때 이 배열에 추가하는 걸 잊지 말 것 — 실측으로 q=60·70·85 가 400 이었다.
    // 현재 사용처: 50=Header 로고 · 60=SquareImage 기본값 · 65=포폴 상세 · 70=UserAvatar · 85=이벤트 상세.
    qualities: [30, 50, 60, 65, 70, 80, 85],
    // Vercel Image Optimizer cache: 30 days (portfolios use immutable UUID URLs)
    minimumCacheTTL: 2592000,
  },

  // Supabase packages ship ESM — no need to transpile (saves ~20KB parsed size)
  transpilePackages: [],

  outputFileTracingIncludes: {
    "/api/cron/encyclopedia-generate/*": ["./src/lib/encyclopedia/fonts/**/*"],
    "/api/admin/encyclopedia/*": ["./src/lib/encyclopedia/fonts/**/*"],
  },

  // Experimental features for performance
  experimental: {
    inlineCss: true,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-popper",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@supabase/ssr",
      "@supabase/supabase-js",
      "@tanstack/react-query",
      "zod",
      "sonner",
      "class-variance-authority",
      "tailwind-merge",
      "openai",
      "sanitize-html",
    ],
  },

  // Replace Next.js built-in polyfills with empty module.
  // Browserslist targets (Chrome 100+, Safari 15.4+, Firefox 100+) natively
  // support all APIs polyfilled by polyfill-module.js (~14KB savings).
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "next/dist/build/polyfills/polyfill-module": resolve("src/lib/empty-polyfill.js"),
      };
    }
    return config;
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default withBundleAnalyzer(nextConfig);
