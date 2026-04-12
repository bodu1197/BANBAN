import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { activateSubscription } from "@/lib/supabase/ad-queries";

const IMP_KEY = process.env.PORTONE_IMP_KEY ?? "";
const IMP_SECRET = process.env.PORTONE_IMP_SECRET ?? "";

interface V1Payment {
    status: string;
    amount: number;
}

/** Get PortOne V1 access token */
async function getV1Token(): Promise<string | null> {
    if (!IMP_KEY || !IMP_SECRET) return null;
    const res = await fetch("https://api.iamport.kr/users/getToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imp_key: IMP_KEY, imp_secret: IMP_SECRET }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { response?: { access_token?: string } };
    return data.response?.access_token ?? null;
}

/** Verify payment via PortOne V1 API */
async function verifyPayment(impUid: string): Promise<V1Payment | null> {
    const token = await getV1Token();
    if (!token) return null;

    const res = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;

    const data = await res.json() as { response?: { status: string; amount: number } };
    return data.response ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { impUid: string; subscriptionId: string; expectedAmount: number };
    const { impUid, subscriptionId, expectedAmount } = body;

    if (!impUid || !subscriptionId) {
        return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const payment = await verifyPayment(impUid);

    if (payment) {
        if (payment.status !== "paid") return NextResponse.json({ error: "payment_not_paid" }, { status: 400 });
        if (payment.amount !== expectedAmount) return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
    }

    // Activate subscription
    const subscription = await activateSubscription(subscriptionId, impUid);
    return NextResponse.json({ success: true, subscription });
}
