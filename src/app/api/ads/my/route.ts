import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getArtistSubscriptions, getActiveSubscription } from "@/lib/supabase/ad-queries";

export async function GET(): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: artist } = await (supabase as any)
        .from("artists").select("id, type_artist").eq("user_id", user.id).single();

    if (!artist) return NextResponse.json({ error: "not_artist" }, { status: 403 });

    const { id: artistId, type_artist: typeArtist } = artist as { id: string; type_artist: string };
    const [subscriptions, active] = await Promise.all([
        getArtistSubscriptions(artistId),
        getActiveSubscription(artistId),
    ]);

    return NextResponse.json({ subscriptions, active, typeArtist });
}
