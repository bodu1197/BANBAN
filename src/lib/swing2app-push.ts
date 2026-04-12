/**
 * Swing2App Push API 연동
 * https://documentation.swing2app.co.kr/developer/server-side-api/push-api-notification
 */

const SWING2APP_API_URL = "https://www.swing2app.com/swapi/push_api_send_message";
const APP_ID = "3c6f90bc-2b46-4f0f-aae1-e0637110ce88";
const API_KEY = "3a6bdc98-fd33-4538-890d-436cc2292793";

interface PushOptions {
  /** 수신 대상 user ID (단일 또는 쉼표 구분, "-1"이면 전체) */
  targetUserIds: string | string[];
  title: string;
  content: string;
  /** 푸시 클릭 시 이동 URL */
  linkUrl?: string;
  imageUrl?: string;
}

interface PushResponse {
  result: boolean;
  userCount?: number;
}

function buildTargetList(ids: string | string[]): string {
  if (typeof ids === "string") return ids;
  return ids.join(",");
}

/**
 * Swing2App Push API로 푸시 알림 발송
 * 실패해도 에러를 던지지 않음 (fire-and-forget)
 */
export async function sendPush(options: PushOptions): Promise<PushResponse | null> {
  try {
    const formData = new URLSearchParams();
    formData.append("app_id", APP_ID);
    formData.append("app_api_key", API_KEY);
    formData.append("send_target_list", buildTargetList(options.targetUserIds));
    formData.append("send_type", "push");
    formData.append("message_title", options.title);
    formData.append("message_content", options.content);

    if (options.linkUrl) formData.append("message_link_url", options.linkUrl);
    if (options.imageUrl) formData.append("message_image_url", options.imageUrl);

    const response = await fetch(SWING2APP_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    return await response.json() as PushResponse;
  } catch {
    // eslint-disable-next-line no-console
    console.error("[Swing2App Push] Failed to send push notification");
    return null;
  }
}

/** 전체 사용자에게 브로드캐스트 푸시 */
export async function sendBroadcastPush(
  title: string,
  content: string,
  linkUrl?: string,
): Promise<PushResponse | null> {
  return sendPush({ targetUserIds: "-1", title, content, linkUrl });
}
