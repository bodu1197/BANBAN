import type { NextConfig } from "next";
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
  },

  // Supabase packages ship ESM — no need to transpile (saves ~20KB parsed size)
  transpilePackages: [],

  // Experimental features for performance
  experimental: {
    // Optimize CSS to reduce render-blocking (critters: extracts critical CSS)
    optimizeCss: true,
    // NOTE: inlineCss is intentionally disabled. With Tailwind v4 the full
    // generated stylesheet is ~173KB; inlining it dumps the entire CSS into
    // the RSC stream where the browser parses it first as JS and then again
    // as CSS, ballooning TBT/main-thread "Other" by ~1.2s on the home page.
    // A normal <link rel="stylesheet"> is cached after first paint and is
    // strictly faster on repeat views.
    // Optimize package imports for tree-shaking
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
      "@hookform/resolvers",
      "react-hook-form",
      "zod",
      "sonner",
      "class-variance-authority",
      "tailwind-merge",
    ],
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default withBundleAnalyzer(nextConfig);
