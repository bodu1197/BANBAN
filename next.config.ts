import type { NextConfig } from "next";
import { resolve } from "node:path";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Turbopack configuration
  turbopack: {
    root: __dirname,
  },

  // Disable automatic locale detection that causes 308 redirects
  skipTrailingSlashRedirect: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
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
        pathname: '/**',
      },
    ],
    // Custom sizes tuned for homepage card widths at 2x DPR:
    // 160 (80px grid), 200 (100px event), 320 (130px sale), 480 (240px popular)
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 200, 256, 320, 384, 480],
    // AVIF first for better compression (30% smaller than WebP)
    formats: ['image/avif', 'image/webp'],
    // Global quality for smaller payloads (component-level overrides still work)
    qualities: [30, 50, 65, 80],
    // Vercel Image Optimizer cache: 30 days (portfolios use immutable UUID URLs)
    minimumCacheTTL: 2592000,
  },

  // Supabase packages ship ESM — no need to transpile (saves ~20KB parsed size)
  transpilePackages: [],

  // Experimental features for performance
  experimental: {
    // NOTE: optimizeCss / inlineCss are App Router 비호환.
    // - optimizeCss(critters)는 Pages Router 전용 — App Router에서 silent no-op.
    // - inlineCss는 Tailwind v4 full sheet(~173KB)를 RSC 스트림에 dump해서
    //   브라우저가 JS로 먼저 parse 후 CSS로 다시 parse → TBT가 ~1.2s 악화됨.
    // 대신 normal <link rel="stylesheet">는 첫 페인트 후 캐시되어 반복 방문에 더 빠름.
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
