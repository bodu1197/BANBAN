import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — 보안 헤더 + 301 redirect 일관성.
 * - next.config.ts headers() 는 모든 경로에 정적 적용 (좋음).
 * - 여기서는 매 요청에 동적으로 nonce / 사용자별 헤더 / 로깅 추가가 필요할 때 사용.
 * - 현재는 보안 헤더 보강 위주로 시작 (CSP nonce, Permissions-Policy 등).
 *
 * matcher 제외:
 * - _next/static, _next/image, favicon: 정적 자원
 * - api: 별도 보안 처리 (route handler 안에서)
 */

const PROD_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://*.vercel-insights.com https://*.vercel-scripts.com https://t1.daumcdn.net https://pcdn2.swing2app.co.kr",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://flagcdn.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://*.iamport.kr https://*.portone.io https://vitals.vercel-insights.com",
    "frame-src 'self' https://*.iamport.kr https://*.portone.io",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
].join("; ");

export function middleware(request: NextRequest): NextResponse {
    const response = NextResponse.next();

    // Content-Security-Policy — 프로덕션에서만 적용.
    // 개발 모드는 HMR/eval 필요로 unsafe-eval 가능 → 일단 production 만 활성화.
    if (process.env.NODE_ENV === "production") {
        response.headers.set("Content-Security-Policy", PROD_CSP);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - api/*       (route handlers — own security)
         * - _next/static/*
         * - _next/image/*
         * - favicon.ico, robots.txt, sitemap.xml
         * - public assets
         */
        "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
    ],
};
