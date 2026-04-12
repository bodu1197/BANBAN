import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getOrCreateWallet, getArtistType } from "@/lib/supabase/point-queries";

export async function GET(): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const [wallet, artistType] = await Promise.all([
        getOrCreateWallet(user.id),
        getArtistType(user.id),
    ]);
    return NextResponse.json({
        balance: wallet.balance,
        totalEarned: wallet.total_earned,
        totalSpent: wallet.total_spent,
        artistType,
    });
}
