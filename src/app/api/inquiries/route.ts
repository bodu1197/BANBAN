import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import {
  fetchMyInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry,
} from "@/lib/supabase/inquiry-queries";

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** GET — 내 건의사항 목록 */
export async function GET(): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return jsonError("unauthorized", 401);

  const inquiries = await fetchMyInquiries(user.id);
  return NextResponse.json({ inquiries });
}

/** POST — 건의사항 작성 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return jsonError("unauthorized", 401);

  const body = await request.json() as { title: string; body: string; imageUrls?: string[] };
  if (!body.title?.trim() || !body.body?.trim()) {
    return jsonError("제목과 내용을 입력해주세요", 400);
  }

  const inquiry = await createInquiry(user.id, body.title.trim(), body.body.trim(), body.imageUrls ?? []);
  if (!inquiry) return jsonError("등록에 실패했습니다", 500);

  return NextResponse.json({ inquiry });
}

/** PATCH — 건의사항 수정 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return jsonError("unauthorized", 401);

  const body = await request.json() as { id: string; title: string; body: string; imageUrls?: string[] };
  if (!body.id || !body.title?.trim() || !body.body?.trim()) {
    return jsonError("필수 항목이 누락되었습니다", 400);
  }

  const ok = await updateInquiry(body.id, user.id, body.title.trim(), body.body.trim(), body.imageUrls);
  if (!ok) return jsonError("수정에 실패했습니다", 500);

  return NextResponse.json({ success: true });
}

/** DELETE — 건의사항 삭제 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return jsonError("unauthorized", 401);

  const body = await request.json() as { id: string };
  if (!body.id) return jsonError("ID가 누락되었습니다", 400);

  const ok = await deleteInquiry(body.id, user.id);
  if (!ok) return jsonError("삭제에 실패했습니다", 500);

  return NextResponse.json({ success: true });
}
