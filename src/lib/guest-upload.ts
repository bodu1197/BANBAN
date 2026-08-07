import "server-only";
import { createAdminClient } from "./supabase/server";

/** 비로그인 업로드는 이 버킷·폴더에만 들어간다 (클라이언트가 경로를 못 정한다). */
export const GUEST_BUCKET = "portfolios";
export const GUEST_FOLDER = "community/guest";

const UPLOAD_LIMIT = 5;
const UPLOAD_WINDOW_SECONDS = 10 * 60;

/** 글에 안 붙은 파일을 지우기까지 기다리는 시간 — 쓰다 만 사람이 돌아올 여지를 준다. */
const ORPHAN_AFTER_HOURS = 24;
const ORPHAN_BATCH = 50;

function logUploadError(where: string, error: { message: string }): void {
  // eslint-disable-next-line no-console -- 서버 로그 전용
  console.error(`[guest-upload] ${where}: ${error.message}`);
}

/**
 * 업로드 한도 확인 + 기록.
 *
 * in-memory 카운터가 아니라 DB 로 센다 — Vercel 은 요청마다 인스턴스를 늘려서
 * 프로세스 메모리 한도는 실효가 없고, 업로드는 스토리지 비용이 걸린다.
 * 카운트와 기록이 한 트랜잭션(advisory lock)이라 동시 요청도 새지 않는다.
 *
 * @returns false 면 한도 초과
 */
export async function reserveGuestUpload(ip: string | null, path: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("record_guest_upload", {
    p_ip: ip,
    p_path: path,
    p_limit: UPLOAD_LIMIT,
    p_window_seconds: UPLOAD_WINDOW_SECONDS,
  });

  if (error) {
    logUploadError("reserveGuestUpload", error);
    return false; // 셀 수 없으면 막는다 — 스토리지 쓰기는 되돌리기 어렵다
  }
  return data === true;
}

/** 업로드가 실패했으면 예약을 되돌린다(한도만 깎이는 일이 없게). */
export async function releaseGuestUpload(path: string): Promise<void> {
  const { error } = await createAdminClient().rpc("forget_guest_uploads", { p_paths: [path] });
  if (error) logUploadError("releaseGuestUpload", error);
}

/**
 * 글에 붙지 않은 채 하루가 지난 게스트 파일을 지운다.
 * ponytail: 스케줄러 없이 게스트가 업로드할 때 같이 돌린다. 양이 늘면 pg_cron 으로 옮긴다.
 */
export async function purgeOrphanGuestUploads(): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("orphan_guest_uploads", {
    p_older_than_hours: ORPHAN_AFTER_HOURS,
    p_limit: ORPHAN_BATCH,
  });

  if (error) {
    logUploadError("orphan_guest_uploads", error);
    return;
  }
  const paths = ((data ?? []) as { path: string }[]).map((row) => row.path);
  if (paths.length === 0) return;

  const { error: removeError } = await supabase.storage.from(GUEST_BUCKET).remove(paths);
  if (removeError) {
    logUploadError("removeOrphans", removeError);
    return; // 스토리지에서 못 지웠으면 기록도 남겨 다음에 다시 시도한다
  }
  await supabase.rpc("forget_guest_uploads", { p_paths: paths });
}
