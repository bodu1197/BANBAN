import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths that should NOT be processed (API, static, internal)
const SKIP_PREFIXES = ["/_next", "/api", "/auth", "/icons", "/images", "/favicon", "/robots", "/sitemap"];

// ─── Session Refresh ────────────────────────────────────

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

// ─── Proxy ──────────────────────────────────────────────

export function proxy(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/api")) {
        return refreshSession(request, NextResponse.next());
    }

    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Legacy /ko/* URLs → 301 redirect to clean path
    if (pathname.split("/")[1] === "ko") {
        const url = request.nextUrl.clone();
        url.pathname = pathname.replace(/^\/ko\/?/, "/") || "/";
        return NextResponse.redirect(url, 301);
    }

    const response = NextResponse.next();
    return refreshSession(request, response);
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
