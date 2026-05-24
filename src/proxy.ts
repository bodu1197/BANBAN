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

const PROD_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://*.vercel-insights.com https://*.vercel-scripts.com https://t1.daumcdn.net https://pcdn2.swing2app.co.kr https://*.iamport.kr https://*.portone.io",
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
