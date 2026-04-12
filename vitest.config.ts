import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.tsx"],
    include: [
      "__tests__/unit/**/*.test.{ts,tsx}",
      "__tests__/components/**/*.test.{ts,tsx}",
    ],
    exclude: ["__tests__/e2e/**/*", "node_modules/**/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/components/ui/**/*", // shadcn/ui 생성 코드
        "src/types/**/*",
        "**/*.d.ts",
        "src/app/**/*.tsx", // 서버 컴포넌트 (페이지, 레이아웃)
        "src/app/**/*.ts", // 서버 라우트 핸들러
        "src/lib/supabase/**/*", // Supabase 서버 전용
        "src/lib/actions/**/*", // Server Actions
        "src/i18n/**/*", // i18n 서버 전용 설정
        "src/middleware.ts", // 미들웨어
        "src/proxy.ts", // 미들웨어 프록시
        "src/**/index.ts", // barrel export (로직 없음)
      ],
      thresholds: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
