import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getAvatarUrl } from "@/lib/supabase/storage-utils";

interface ReviewRow {
    id: string;
    rating: number;
    content: string | null;
    created_at: string;
    artist_id: string;
    // PostgREST 1:1 relation 은 object, 일부 환경에서 1:N 으로 인식하면 array — 둘 다 안전 처리
    artist: { title: string; profile_image_path: string | null } | { title: string; profile_image_path: string | null }[] | null;
}

function pickArtist(artist: ReviewRow["artist"]): { title: string; profile_image_path: string | null } | null {
    if (!artist) return null;
    return Array.isArray(artist) ? (artist[0] ?? null) : artist;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "20");
    const offset = Number(searchParams.get("offset") ?? "0");

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, count } = await (supabase as any)
        .from("reviews")
        .select("id, rating, content, created_at, artist_id, artist:artists(title, profile_image_path)", { count: "exact" })
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    // artist.profile_image_path 의 raw Storage 경로를 avatars 버킷 public URL 로 치환.
    // 키 이름 유지(profile_image_path) — 기존 클라이언트 호환. 값만 변환.
    const reviews = ((data ?? []) as ReviewRow[]).map((r) => {
        const a = pickArtist(r.artist);
        return {
            id: r.id,
            rating: r.rating,
            content: r.content,
            created_at: r.created_at,
            artist_id: r.artist_id,
            artist: a ? { title: a.title, profile_image_path: getAvatarUrl(a.profile_image_path) } : null,
        };
    });

    return NextResponse.json({ reviews, total: count ?? 0 });
}
