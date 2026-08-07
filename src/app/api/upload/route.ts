// @client-reason: API Route for image upload and optimization
/* eslint-disable security/detect-object-injection -- Using controlled keys from IMAGE_SIZES constant */
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sanitizeStoragePath } from "@/lib/supabase/storage-utils";
import { getClientIp } from "@/lib/rate-limit";
import {
  reserveGuestUpload,
  releaseGuestUpload,
  purgeOrphanGuestUploads,
  GUEST_BUCKET,
  GUEST_FOLDER,
} from "@/lib/guest-upload";

export const maxDuration = 60;

// 이미지 사이즈 규격
const IMAGE_SIZES = {
  thumb: { width: 150, height: 150 },
  small: { width: 320, height: 320 },
  medium: { width: 640, height: 640 },
  large: { width: 1280, height: 1280 },
  original: { width: 2000, height: 2000 },
} as const;

type ImageSize = keyof typeof IMAGE_SIZES;

interface UploadResult {
  success: boolean;
  paths?: Record<ImageSize, string>;
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const WEBP_CONTENT_TYPE = "image/webp";
const CACHE_ONE_YEAR = "31536000";

/**
 * 압축 폭탄 방어 — 파일 크기 상한(10MB)은 **압축 후** 크기라 소용이 없다.
 * 수백 KB 짜리가 수억 픽셀로 풀리면 sharp 가 기가바이트를 먹는다.
 * (같은 상한을 lib/event/image-service.ts 도 쓴다)
 */
const SHARP_INPUT_PIXEL_LIMIT = 1024 * 1024 * 16;
const SHARP_OPTIONS = { failOn: "error", limitInputPixels: SHARP_INPUT_PIXEL_LIMIT } as const;

/** SVG 는 스크립트를 품을 수 있어 제외한다 — `image/` 접두사 검사만으로는 통과된다. */
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const INVALID_IMAGE = "이미지 파일이 아닙니다";
// 사용자에게 나가는 문구는 전부 한국어 고정 — 클라이언트가 이 값을 그대로 toast 로 띄운다.
const INTERNAL_SERVER_ERROR = "업로드에 실패했습니다. 잠시 후 다시 시도해주세요";
const BAD_REQUEST = "요청이 올바르지 않습니다";
const UPLOAD_ERROR_LOG = "Upload error:";
const ALLOWED_BUCKETS = new Set(["portfolios", "avatars", "before-after", "inquiries", "artist-media", "banners"]);

function validateBucket(bucket: string): boolean {
  return ALLOWED_BUCKETS.has(bucket);
}

/**
 * 경로가 "아티스트 소유" 네임스페이스면 그 artistId 를 반환, 아니면 null.
 *   avatars     → `<artistId>/…`
 *   portfolios  → `artists/<artistId>/…`, `before-after/<artistId>/…` (portfolios 버킷 내부 폴더)
 * ⚠️ 소유권 검증이 필요한 새 업로드 네임스페이스를 추가하면 반드시 여기 규칙도 추가할 것.
 *    authorizePutUpload 는 여기서 null 인 경로를 "인증 사용자 허용(allow-by-default)"으로 통과시킨다.
 */
function artistScopedId(bucket: string, path: string): string | null {
  const seg = path.split("/");
  if (bucket === "avatars") return seg[0] || null;
  if (bucket === "portfolios" && (seg[0] === "artists" || seg[0] === "before-after")) return seg[1] || null;
  return null;
}

/** profiles.is_admin 확인 (service_role — 임의 userId 조회라 RLS 우회 필요). */
async function isUserAdmin(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<boolean> {
  const { data } = await admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return (data as { is_admin: boolean | null } | null)?.is_admin === true;
}

/**
 * PUT 업로드 경로 소유권/권한 검증 — IDOR(타인 파일 경로 지정) 차단.
 * - banners 버킷                    : 관리자 전용 (quick-menu 등 어드민 콘텐츠)
 * - 아티스트 네임스페이스            : 경로의 artistId 가 본인 소유이거나 관리자만 (artistScopedId 참조)
 * - 그 외(community 등 비-scoped 경로): 인증 사용자 모두 허용(allow-by-default). 신규 파일 생성만 가능하고
 *   기존 파일 덮어쓰기는 upsert:false 로 차단된다. 소유권이 필요해지면 artistScopedId 에 규칙 추가.
 */
async function authorizePutUpload(bucket: string, path: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (bucket === "banners") return isUserAdmin(admin, userId);

  const artistId = artistScopedId(bucket, path);
  if (!artistId) return true;

  const { data } = await admin.from("artists").select("user_id").eq("id", artistId).maybeSingle();
  const ownerId = (data as { user_id: string | null } | null)?.user_id;
  return ownerId === userId ? true : isUserAdmin(admin, userId);
}

/**
 * 이미지를 WebP로 변환하고 리사이즈
 */
async function processImage(buffer: Buffer, size: ImageSize): Promise<Buffer> {
  const dimensions = IMAGE_SIZES[size];

  return sharp(buffer, SHARP_OPTIONS)
    .resize(dimensions.width, dimensions.height, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * 인증 확인
 */
async function validateAuth(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

/**
 * 파일 유효성 검사
 */
function validateFile(file: File | null): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: INVALID_IMAGE };
  // 클라이언트가 보낸 MIME 은 위조 가능하지만 1차 관문이다. 실제 디코딩은 SHARP_OPTIONS 가 막는다.
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return { valid: false, error: INVALID_IMAGE };
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: "파일이 너무 큽니다 (최대 10MB)" };
  return { valid: true };
}

/** 바디를 파싱하기 전에 선언된 크기부터 본다 — 읽으면서 메모리를 먼저 태우지 않게. */
function declaredSizeTooLarge(request: NextRequest): boolean {
  const length = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(length) && length > MAX_FILE_SIZE * 1.1; // multipart 오버헤드 여유
}

/**
 * Common auth + file validation for upload handlers.
 * @param allowGuest 비로그인 허용 여부. true 면 userId 가 null 로 돌아온다(커뮤니티 게스트 글 첨부용).
 */
async function getAuthenticatedFile(request: NextRequest, allowGuest = false): Promise<
  | { ok: true; userId: string | null; file: File; buffer: Buffer; searchParams: URLSearchParams }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const userId = await validateAuth(supabase);
  if (!userId && !allowGuest) {
    return { ok: false, response: NextResponse.json({ success: false, error: "로그인이 필요합니다" }, { status: 401 }) };
  }
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const validation = validateFile(file);
  if (!validation.valid) {
    return { ok: false, response: NextResponse.json({ success: false, error: validation.error }, { status: 400 }) };
  }
  const validFile = file as File;
  const arrayBuffer = await validFile.arrayBuffer();
  return { ok: true, userId, file: validFile, buffer: Buffer.from(arrayBuffer), searchParams: request.nextUrl.searchParams };
}

/**
 * 모든 사이즈로 이미지 업로드 (admin client 사용)
 */
async function uploadAllSizes(
  buffer: Buffer,
  basePath: string,
  bucket: string
): Promise<{ paths: Record<string, string> | null; error?: string }> {
  const adminClient = createAdminClient();
  const paths: Record<string, string> = {};
  const sizes = Object.keys(IMAGE_SIZES) as ImageSize[];

  const results = await Promise.all(
    sizes.map(async (size) => {
      const processedBuffer = await processImage(buffer, size);
      const filePath = `${basePath}/${size}.webp`;

      // upsert:true 안전 — POST 의 basePath 는 서버가 crypto.randomUUID() 로 생성(공격자가 타인 경로 지정 불가).
      // PUT 과 달리 user-controlled path 가 아니므로 IDOR 대상이 아니다.
      const { error: uploadError } = await adminClient.storage
        .from(bucket)
        .upload(filePath, processedBuffer, {
          contentType: WEBP_CONTENT_TYPE,
          cacheControl: CACHE_ONE_YEAR,
          upsert: true,
        });

      return { size, filePath, error: uploadError };
    }),
  );

  for (const result of results) {
    if (result.error) {
      return { paths: null, error: `Failed to upload ${result.size}: ${result.error.message}` };
    }
    paths[result.size] = result.filePath;
  }

  return { paths };
}

/** POST 쿼리스트링 → 저장 위치. 버킷·폴더가 올바르지 않으면 null. */
function resolvePostTarget(searchParams: URLSearchParams): { bucket: string; basePath: string } | null {
  const bucket = searchParams.get("bucket") ?? DEFAULT_BUCKET;
  const folder = searchParams.get("folder") ?? "";
  if (!validateBucket(bucket)) return null;
  if (folder && !sanitizeStoragePath(folder)) return null;

  const id = crypto.randomUUID();
  return { bucket, basePath: folder ? `${folder}/${id}` : id };
}

/**
 * POST /api/upload
 * 이미지 업로드 및 최적화
 */
export async function POST(request: NextRequest): Promise<NextResponse<UploadResult>> {
  try {
    const auth = await getAuthenticatedFile(request); // 로그인 필수 (게스트는 PUT 만)
    if (!auth.ok) return auth.response as NextResponse<UploadResult>;

    const target = resolvePostTarget(auth.searchParams);
    if (!target) return badRequest();
    // 실제로 디코딩되는 이미지인지 먼저 본다 — 아니면 5개 사이즈 변환 중 throw 해서 500 이 된다.
    if (!(await isDecodableImage(auth.buffer))) return INVALID_IMAGE_RESPONSE() as NextResponse<UploadResult>;

    const { bucket, basePath } = target;
    const result = await uploadAllSizes(auth.buffer, basePath, bucket);
    if (!result.paths) {
      // eslint-disable-next-line no-console
      console.error(UPLOAD_ERROR_LOG,result.error);
      return NextResponse.json({ success: false, error: INTERNAL_SERVER_ERROR }, { status: 500 });
    }

    return NextResponse.json({ success: true, paths: result.paths as Record<ImageSize, string> });
  } catch {
    return NextResponse.json({ success: false, error: INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}

/**
 * 비로그인 업로드.
 *
 * 경로를 클라이언트에서 받지 않고 서버가 만든다 — 받으면 남의 네임스페이스
 * (`artists/<남의id>/…`)에 파일을 만들 수 있다. 버킷도 고정이다.
 */
async function handleGuestPut(request: NextRequest, buffer: Buffer): Promise<NextResponse> {
  const rawIp = getClientIp(request);
  const ip = rawIp === "unknown" ? null : rawIp;
  const path = `${GUEST_FOLDER}/${crypto.randomUUID()}.webp`;

  if (!(await reserveGuestUpload(ip, path))) {
    return NextResponse.json(
      { success: false, error: "업로드가 너무 잦습니다. 잠시 후 다시 시도해주세요" },
      { status: 429 },
    );
  }

  const processed = await toWebp(buffer);
  if (!processed) {
    await releaseGuestUpload(path); // 한도만 깎이는 일이 없게 되돌린다
    return INVALID_IMAGE_RESPONSE();
  }

  const { error } = await createAdminClient().storage
    .from(GUEST_BUCKET)
    .upload(path, processed, { contentType: WEBP_CONTENT_TYPE, cacheControl: CACHE_ONE_YEAR, upsert: false });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Guest upload error:", error.message);
    await releaseGuestUpload(path);
    return NextResponse.json({ success: false, error: INTERNAL_SERVER_ERROR }, { status: 500 });
  }

  await purgeOrphanGuestUploads();
  return NextResponse.json({ success: true, path });
}

/** 로그인 사용자 업로드 — 경로를 직접 지정하되 소유권을 검증한다. */
async function handleMemberPut(
  searchParams: URLSearchParams,
  buffer: Buffer,
  userId: string,
): Promise<NextResponse> {
  const bucket = searchParams.get("bucket") ?? DEFAULT_BUCKET;
  const rawPath = searchParams.get("path");
  const path = rawPath ? sanitizeStoragePath(rawPath) : null;
  if (!validateBucket(bucket) || !path) return badRequest();
  // 소유권 검증 — 타인 소유 경로 지정(IDOR) 차단. createAdminClient(RLS 우회)로 임의 경로에 쓰기 전 필수.
  if (!(await authorizePutUpload(bucket, path, userId))) {
    return NextResponse.json({ success: false, error: "권한이 없습니다" }, { status: 403 });
  }

  const processedBuffer = await toWebp(buffer);
  if (!processedBuffer) return INVALID_IMAGE_RESPONSE();

  // upsert:false — 신규 경로만 생성, 기존 파일 덮어쓰기(타인 파일 변조) 차단. 모든 호출처는 타임스탬프/UUID 로 새 경로 사용.
  const { error: uploadError } = await createAdminClient().storage
    .from(bucket)
    .upload(path, processedBuffer, {
      contentType: WEBP_CONTENT_TYPE,
      cacheControl: CACHE_ONE_YEAR,
      upsert: false,
    });

  if (uploadError) {
    // 원문에는 버킷·객체 키가 들어있다 — 클라이언트가 그대로 toast 로 띄우므로 서버 로그로만 남긴다.
    // eslint-disable-next-line no-console
    console.error(UPLOAD_ERROR_LOG,uploadError.message);
    return NextResponse.json({ success: false, error: INTERNAL_SERVER_ERROR }, { status: 500 });
  }

  return NextResponse.json({ success: true, path });
}

/**
 * 단일 이미지를 WebP 로 변환 (PUT 경로 공통).
 *
 * 여기서 나는 예외는 전부 "입력이 이미지가 아니거나 상한을 넘었다" 는 뜻이다 —
 * 파이프라인은 고정이라 서버 잘못일 여지가 없다. 그래서 500 이 아니라 null 로 돌려
 * 호출부가 400 을 주게 한다(요청자가 마음대로 5xx 를 만들지 못하게).
 */
async function toWebp(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buffer, SHARP_OPTIONS)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Image decode failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

const DEFAULT_BUCKET = "portfolios";

const INVALID_IMAGE_RESPONSE = (): NextResponse =>
  NextResponse.json({ success: false, error: INVALID_IMAGE }, { status: 400 });

const badRequest = <T,>(): NextResponse<T> =>
  NextResponse.json({ success: false, error: BAD_REQUEST }, { status: 400 }) as NextResponse<T>;

/** 실제로 디코딩되는 이미지인지(그리고 픽셀 상한 안인지) 헤더만 읽어 확인한다. */
async function isDecodableImage(buffer: Buffer): Promise<boolean> {
  try {
    const { width, height } = await sharp(buffer, SHARP_OPTIONS).metadata();
    return Boolean(width && height);
  } catch {
    return false;
  }
}

/**
 * PUT /api/upload
 * 단일 이미지 업로드 (아티스트 등록용 / 커뮤니티 첨부)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // 비로그인도 커뮤니티 글에 사진을 첨부할 수 있다(경로는 서버가 정한다 — handleGuestPut 참조).
    // 바디를 읽기 전에 선언 크기부터 끊는다 — 파싱 자체가 메모리를 먹는다.
    if (declaredSizeTooLarge(request)) {
      return NextResponse.json({ success: false, error: "파일이 너무 큽니다 (최대 10MB)" }, { status: 413 });
    }

    const auth = await getAuthenticatedFile(request, true);
    if (!auth.ok) return auth.response;

    if (!auth.userId) return handleGuestPut(request, auth.buffer);

    return await handleMemberPut(auth.searchParams, auth.buffer, auth.userId);
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(UPLOAD_ERROR_LOG,err);
    return NextResponse.json({ success: false, error: INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}

// NOTE: DELETE 핸들러는 의도적으로 제거됨 (M9 감사).
// 호출처가 전혀 없는 dead code 였고, 소유권 검증 없이 createAdminClient(RLS 우회)로
// 임의 경로의 파일을 삭제할 수 있는 IDOR(CWE-639) 취약점이었다.
// 추후 이미지 삭제가 필요하면 버킷별 소유권 검증을 반드시 포함해 재구현할 것:
//   avatars/portfolios/before-after → 경로 prefix 의 artistId/userId 를 추출해
//   artists.user_id == 세션 userId (또는 profiles.id) 로 확인, banners/admin 계열은 requireAdmin().
