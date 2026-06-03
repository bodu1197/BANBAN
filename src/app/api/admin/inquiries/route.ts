import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { fetchAllInquiries, replyToInquiry, updateInquiryStatus } from "@/lib/supabase/inquiry-queries";
import { notifyUser } from "@/lib/supabase/notification-queries";

/** GET — 전체 건의사항 목록 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const inquiries = await fetchAllInquiries();
  return NextResponse.json({ inquiries });
}

/** POST — 관리자 답변 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { id: string; reply: string; imageUrls?: string[] };
  if (!body.id || !body.reply?.trim()) {
    return NextResponse.json({ error: "답변 내용을 입력해주세요" }, { status: 400 });
  }

  // inquiry 소유자(user_id)는 클라이언트가 보낸 값이 아닌 DB 에서 직접 조회 — 잘못된 알림 발송 차단.
  const supabase = auth.supabase;
  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("user_id")
    .eq("id", body.id)
    .single();
  if (!inquiry) return NextResponse.json({ error: "건의사항을 찾을 수 없습니다" }, { status: 404 });

  const ok = await replyToInquiry(body.id, body.reply.trim(), body.imageUrls ?? []);
  if (!ok) return NextResponse.json({ error: "답변 등록에 실패했습니다" }, { status: 500 });

  const inquiryOwnerId = (inquiry as { user_id: string | null }).user_id;
  if (inquiryOwnerId) {
    notifyUser(inquiryOwnerId, {
      type: "INQUIRY_REPLIED",
      title: "건의사항에 답변이 등록되었습니다",
      body: body.reply.trim().slice(0, 100),
      data: { inquiryId: body.id },
    }).catch(() => { /* non-fatal */ });
  }

  return NextResponse.json({ success: true });
}

/** PATCH — 상태 변경 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { id: string; status: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const ok = await updateInquiryStatus(body.id, body.status);
  if (!ok) return NextResponse.json({ error: "상태 변경 실패" }, { status: 500 });

  return NextResponse.json({ success: true });
}
