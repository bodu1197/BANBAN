import { createAdminClient } from "./server";

export interface InquiryRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: "OPEN" | "REPLIED" | "CLOSED";
  admin_reply: string | null;
  admin_replied_at: string | null;
  image_urls: string[];
  admin_reply_image_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface InquiryWithUser extends InquiryRow {
  user?: { username: string; nickname: string | null; email: string | null };
}

/** 사용자 본인의 건의사항 목록 */
export async function fetchMyInquiries(userId: string): Promise<InquiryRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch inquiries: ${error.message}`);
    return [];
  }
  return (data ?? []) as InquiryRow[];
}

/** 건의사항 생성 */
export async function createInquiry(
  userId: string,
  title: string,
  body: string,
  imageUrls: string[] = [],
): Promise<InquiryRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inquiries")
    .insert({ user_id: userId, title, body, image_urls: imageUrls })
    .select()
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to create inquiry: ${error.message}`);
    return null;
  }
  return data as InquiryRow;
}

/** 건의사항 수정 (본인만) */
export async function updateInquiry(
  id: string,
  userId: string,
  title: string,
  body: string,
  imageUrls?: string[],
): Promise<boolean> {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = { title, body, updated_at: new Date().toISOString() };
  if (imageUrls !== undefined) updates.image_urls = imageUrls;
  const { error } = await supabase
    .from("inquiries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);

  return !error;
}

/** 건의사항 삭제 (본인만) */
export async function deleteInquiry(id: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("inquiries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  return !error;
}

/** [관리자] 전체 건의사항 목록 (사용자 정보 포함) */
export async function fetchAllInquiries(): Promise<InquiryWithUser[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch all inquiries: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as InquiryRow[];
  if (rows.length === 0) return [];

  // 사용자 정보 별도 조회
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, nickname, email")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; username: string; nickname: string | null; email: string | null }) => [p.id, p]),
  );

  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      ...row,
      user: profile ? { username: profile.username, nickname: profile.nickname, email: profile.email } : undefined,
    };
  });
}

/** [관리자] 답변 등록 */
export async function replyToInquiry(id: string, reply: string, imageUrls: string[] = []): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("inquiries")
    .update({
      admin_reply: reply,
      admin_replied_at: new Date().toISOString(),
      admin_reply_image_urls: imageUrls,
      status: "REPLIED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return !error;
}

/** [관리자] 상태 변경 */
export async function updateInquiryStatus(id: string, status: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("inquiries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}
