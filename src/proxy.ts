import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_REFRESH_SKIP_PREFIXES = [
    "/_next",
    "/auth",
    "/icons",
    "/images",
    "/favicon",
    "/robots",
    "/sitemap",
];

/**
 * Content Security Policy 정의 — 디렉티브별 도메인을 카테고리 코멘트와 함께 관리.
 * 새 외부 의존성 추가 시 해당 카테고리 아래에 도메인 추가.
 *
 * 카테고리:
 * - SELF: 우리 origin
 * - SUPABASE: DB / Storage / Realtime
 * - VERCEL: Analytics / Insights
 * - PAYMENT: 결제 (iamport, portone)
 * - ADS: Google Ads conversion tracking + remarketing
 *   - Google ads pixel 은 사용자 지역에 따라 여러 TLD 로 분기되므로 흔한 TLD 명시 (google.com, google.co.kr/jp/id/hk/sg/tw)
 * - MEDIA_VENDOR: 외부 미디어/모델 호스팅 (kakao, daum, jsdelivr, googleapis)
 * - KAKAO_POSTCODE: 다음 우편번호 팝업
 */
const CSP_DIRECTIVES: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
        "'self'",
        "'unsafe-inline'",
        "'wasm-unsafe-eval'", // MediaPipe wasm
        // Vercel
        "https://*.vercel-insights.com", "https://*.vercel-scripts.com",
        // Payment
        "https://*.iamport.kr", "https://*.portone.io",
        // Media vendor (postcode, swing2app, MediaPipe CDN)
        "https://t1.daumcdn.net", "https://pcdn2.swing2app.co.kr", "https://cdn.jsdelivr.net",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
        "'self'", "data:", "blob:",
        // Supabase Storage
        "https://*.supabase.co",
        // External media
        "https://flagcdn.com", "https://*.googleusercontent.com", "https://k.kakaocdn.net", "https://*.pstatic.net",
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
        "'self'",
        // Supabase
        "https://*.supabase.co", "wss://*.supabase.co",
        // AI
        "https://api.openai.com",
        // Payment
        "https://*.iamport.kr", "https://*.portone.io",
        // Vercel
        "https://vitals.vercel-insights.com",
        // Media vendor (MediaPipe wasm + model)
        "https://cdn.jsdelivr.net", "https://storage.googleapis.com",
    ],
    "frame-src": [
        "'self'",
        "https://*.iamport.kr", "https://*.portone.io",
        "https://postcode.map.kakao.com", "https://t1.daumcdn.net",
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
};

const PROD_CSP = Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");

function applySecurityHeaders(response: NextResponse): NextResponse {
    if (process.env.NODE_ENV === "production") {
        response.headers.set("Content-Security-Policy", PROD_CSP);
    }
    return response;
}

function refreshSession(request: NextRequest, response: NextResponse): NextResponse {
    let supabaseResponse = response;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    for (const { name, value } of cookiesToSet) {
                        request.cookies.set(name, value);
                    }
                    supabaseResponse = NextResponse.next({ request });
                    for (const { name, value, options } of cookiesToSet) {
                        supabaseResponse.cookies.set(name, value, options);
                    }
                },
            },
        },
    );

    void supabase.auth.getUser();
    return supabaseResponse;
}

export function proxy(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/api")) {
        return applySecurityHeaders(refreshSession(request, NextResponse.next()));
    }

    if (SESSION_REFRESH_SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
        return applySecurityHeaders(NextResponse.next());
    }

    return applySecurityHeaders(refreshSession(request, NextResponse.next()));
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
