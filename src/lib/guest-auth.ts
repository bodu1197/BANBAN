import "server-only";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { getClientIp, rateLimit } from "./rate-limit";
import { createAdminClient } from "./supabase/server";
import { guestInputError, type GuestInput } from "./guest-limits";
import { containsProfanity } from "./utils/profanity-filter";

const BCRYPT_ROUNDS = 10;

export type { GuestInput };

/** 게스트 글/댓글 대상 테이블 — guest_authors 의 어느 컬럼으로 연결되는지 결정한다. */
export type GuestTarget = "posts" | "comments";

function targetColumn(target: GuestTarget): "post_id" | "comment_id" {
  return target === "posts" ? "post_id" : "comment_id";
}

/** 회원인 척하는 닉네임 차단 — 게스트는 신원 확인이 안 된다. */
const RESERVED_NAMES = ["관리자", "운영자", "운영진", "admin", "administrator", "반언니", "공식"];

/** 요청 IP. 도배 차단 키이자 관리자에게 보여줄 감사 기록. */
export async function getRequestIp(): Promise<string> {
  return getClientIp(await headers());
}

// 같은 IP 에서 1분 안에 쓸 수 있는 개수 — 댓글은 대화가 끊기지 않게 조금 넉넉히.
export const GUEST_POST_LIMIT = 1;
export const GUEST_COMMENT_LIMIT = 3;
export const GUEST_WINDOW_SECONDS = 60;

/** 작성 IP 보관기간. 지나면 IP 만 지우고 비밀번호 행은 남긴다(글은 계속 수정·삭제 가능). */
const IP_RETENTION_DAYS = 90;

/** 비밀번호 틀린 횟수가 이만큼 쌓이면 잠근다. */
const MAX_FAIL_COUNT = 10;
export const LOCK_MINUTES = 10;

export const GUEST_FLOOD_ERROR = "너무 자주 작성했습니다. 잠시 후 다시 시도해주세요";

export type PreparedGuest =
  | { ok: true; name: string; passwordHash: string; ip: string | null }
  | { ok: false; error: string };

/** bcrypt 해시 전에 거는 값싼 관문 — 해시는 요청당 수백 ms CPU 라 그 앞에서 끊어야 한다. */
const HASH_GUARD_LIMIT = 10;
const HASH_GUARD_WINDOW_MS = 60_000;

/**
 * 게스트 작성 준비 — 형식/사칭/욕설 검사 후 비밀번호를 해시한다.
 *
 * 실제 도배 차단은 여기서 하지 않는다. 세고 나서 넣으면 그 사이에 낀 동시 요청이 전부 통과하므로
 * (TOCTOU), 카운트와 insert 를 한 트랜잭션+advisory lock 으로 묶은 RPC 가 담당한다.
 * 여기 있는 건 그 앞단에서 bcrypt CPU 를 태우지 못하게 막는 값싼 관문이다.
 */
export async function prepareGuest(guest: GuestInput | undefined): Promise<PreparedGuest> {
  const formatError = guestInputError(guest);
  if (formatError) return { ok: false, error: formatError };

  const name = (guest as GuestInput).name.trim();
  if (containsProfanity(name)) return { ok: false, error: "닉네임에 부적절한 표현이 포함되어 있습니다" };
  if (RESERVED_NAMES.some((reserved) => name.toLowerCase().includes(reserved.toLowerCase()))) {
    return { ok: false, error: "사용할 수 없는 닉네임입니다" };
  }

  const ip = await getRequestIp();
  if (ip !== "unknown") {
    const guard = rateLimit({ key: `guest-hash:${ip}`, limit: HASH_GUARD_LIMIT, windowMs: HASH_GUARD_WINDOW_MS });
    if (!guard.success) return { ok: false, error: GUEST_FLOOD_ERROR };
  }

  return {
    ok: true,
    name,
    passwordHash: await bcrypt.hash((guest as GuestInput).password, BCRYPT_ROUNDS),
    ip: ip === "unknown" ? null : ip,
  };
}

/** 게스트 경로의 DB 오류는 사용자에게 감추고 서버 로그로만 남긴다. */
export function logGuestError(where: string, error: { message: string }): void {
  // eslint-disable-next-line no-console -- 서버 로그 전용
  console.error(`[guest-auth] ${where}: ${error.message}`);
}

/** posts 에 넣을 값 (작성자 컬럼 제외) — 필드명이 바뀌면 컴파일이 깨지도록 명시한다. */
export interface GuestPostRow {
  title: string;
  content: string;
  type_board: string;
  type_post: string;
  type_artist: string;
  image_url: string | null;
  youtube_url: string | null;
}

/**
 * 게스트 글 저장 — 도배 카운트·본문·비밀번호를 한 트랜잭션에 넣는다.
 * @returns 새 글 id, 도배로 막히면 null
 */
export async function insertGuestPost(
  row: Readonly<GuestPostRow>,
  guest: { name: string; passwordHash: string; ip: string | null },
): Promise<string | null> {
  const { data, error } = await createAdminClient().rpc("create_guest_post", {
    p_title: row.title,
    p_content: row.content,
    p_type_board: row.type_board,
    p_type_post: row.type_post,
    p_type_artist: row.type_artist,
    p_image_url: row.image_url,
    p_youtube_url: row.youtube_url,
    p_guest_name: guest.name,
    p_password_hash: guest.passwordHash,
    p_ip: guest.ip,
    p_limit: GUEST_POST_LIMIT,
    p_window_seconds: GUEST_WINDOW_SECONDS,
  });

  if (error) {
    logGuestError("insertGuestPost", error);
    throw new Error(error.message);
  }
  if (data) await purgeExpiredIps();
  return data;
}

/**
 * 게스트 댓글 저장 — 도배 카운트·본문·비밀번호를 한 트랜잭션에 넣는다.
 * @returns 새 댓글 id, 도배로 막히면 null
 */
export async function insertGuestComment(
  postId: string,
  parentId: string | null,
  content: string,
  guest: { name: string; passwordHash: string; ip: string | null },
): Promise<string | null> {
  const { data, error } = await createAdminClient().rpc("create_guest_comment", {
    p_post_id: postId,
    p_parent_id: parentId,
    p_content: content,
    p_guest_name: guest.name,
    p_password_hash: guest.passwordHash,
    p_ip: guest.ip,
    p_limit: GUEST_COMMENT_LIMIT,
    p_window_seconds: GUEST_WINDOW_SECONDS,
  });

  if (error) {
    logGuestError("insertGuestComment", error);
    throw new Error(error.message);
  }
  if (data) await purgeExpiredIps();
  return data;
}

/**
 * 보관기간이 지난 작성 IP 를 지운다.
 *
 * ponytail: 별도 스케줄러 없이 게스트가 글을 쓸 때 같이 돌린다(작성이 IP당 1건/분이라 부담 없음).
 *           작성이 뜸해서 파기가 늦어지는 게 문제가 되면 pg_cron 으로 옮긴다.
 * 🔴 await 필수 — supabase 쿼리 빌더는 then() 이 불려야 요청이 나가는 lazy thenable 이라
 *    `void builder` 로 두면 쿼리가 아예 전송되지 않는다.
 */
async function purgeExpiredIps(): Promise<void> {
  const cutoff = new Date(Date.now() - IP_RETENTION_DAYS * 24 * 60 * 60_000).toISOString();
  const { error } = await createAdminClient()
    .from("guest_authors")
    .update({ ip: null })
    .not("ip", "is", null)
    .lt("created_at", cutoff);
  if (error) logGuestError("purgeExpiredIps", error);
}

export type GuestVerdict = "ok" | "wrong" | "locked";

interface GuestAuthRow {
  id: string;
  password_hash: string;
  fail_count: number;
  locked_until: string | null;
}

/** bcrypt 비교는 요청당 수백 ms 의 CPU 다 — 인스턴스 단위로 한 번 더 상한을 둔다. */
const VERIFY_CPU_LIMIT = 30;
const VERIFY_CPU_WINDOW_MS = 10 * 60_000;

/**
 * 게스트 글/댓글 비밀번호 확인.
 *
 * 비밀번호가 4자라 대입이 쉬우므로 실패 횟수를 DB 에 쌓아 잠근다(인스턴스 무관).
 * 카운터는 성공했을 때만 리셋한다 — 잠금이 풀린 뒤 한 번 더 틀리면 곧바로 다시 잠긴다.
 * 저장된 비밀번호가 없으면(legacy 글) 항상 "wrong".
 */
export async function verifyGuestPassword(
  target: GuestTarget,
  rowId: string,
  password: string | undefined,
): Promise<GuestVerdict> {
  if (typeof password !== "string" || !password) return "wrong";

  // IP 를 못 읽는 환경에서는 이 관문을 건다면 모든 방문자가 한 버킷을 공유해
  // 한 명이 전체를 잠글 수 있다 → 건너뛰고 DB 잠금(fail_count)에 맡긴다.
  const ip = await getRequestIp();
  if (ip !== "unknown") {
    const cpuBudget = rateLimit({
      key: `guest-verify:${ip}`,
      limit: VERIFY_CPU_LIMIT,
      windowMs: VERIFY_CPU_WINDOW_MS,
    });
    if (!cpuBudget.success) return "locked";
  }

  const { data } = await createAdminClient()
    .from("guest_authors")
    .select("id, password_hash, fail_count, locked_until")
    .eq(targetColumn(target), rowId)
    .maybeSingle();

  const row = data as GuestAuthRow | null;
  if (!row) return "wrong";
  if (row.locked_until && new Date(row.locked_until) > new Date()) return "locked";

  const matched = await bcrypt.compare(password, row.password_hash);
  return recordAttempt(row.id, matched);
}

/**
 * 시도 결과를 원자적으로 기록한다.
 * read-modify-write 로 하면 늦게 도착한 요청이 방금 걸린 잠금을 지워버린다.
 */
async function recordAttempt(id: string, success: boolean): Promise<GuestVerdict> {
  const { data, error } = await createAdminClient().rpc("record_guest_auth_attempt", {
    p_id: id,
    p_success: success,
    p_max: MAX_FAIL_COUNT,
    p_lock_minutes: LOCK_MINUTES,
  });

  // 기록에 실패하면 fail-closed — 여기서 "wrong" 을 주면 잠금이 통째로 무력화된다.
  if (error) {
    logGuestError("recordAttempt", error);
    return "locked";
  }
  if (success) return "ok";

  const lockedUntil = data as string | null;
  return lockedUntil && new Date(lockedUntil) > new Date() ? "locked" : "wrong";
}

interface GuestIpRow {
  post_id: string | null;
  comment_id: string | null;
  ip: string | null;
}

/** in() 은 GET 쿼리스트링이라 URL 이 길어지면 414 로 끊긴다 — 조각내서 보낸다. */
const IP_LOOKUP_CHUNK = 80;

/**
 * 게시글과 댓글들의 작성 IP — **관리자에게만** 넘길 값이다.
 * 반환 맵의 키는 게시글/댓글 id.
 */
export async function fetchGuestIps(
  postId: string | null,
  commentIds: readonly string[],
): Promise<Record<string, string>> {
  const supabase = createAdminClient();
  const select = "post_id, comment_id, ip";

  const queries: PromiseLike<{ data: GuestIpRow[] | null }>[] = [];
  if (postId) queries.push(supabase.from("guest_authors").select(select).eq("post_id", postId));
  for (let i = 0; i < commentIds.length; i += IP_LOOKUP_CHUNK) {
    const chunk = commentIds.slice(i, i + IP_LOOKUP_CHUNK);
    queries.push(supabase.from("guest_authors").select(select).in("comment_id", [...chunk]));
  }
  if (queries.length === 0) return {};

  const results = await Promise.all(queries);
  const rows = results.flatMap((r) => r.data ?? []);

  return Object.fromEntries(
    rows.flatMap((row) => {
      const key = row.post_id ?? row.comment_id;
      return key && row.ip ? [[key, row.ip] as const] : [];
    }),
  );
}
