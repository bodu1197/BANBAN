// @client-reason: API Route for image upload and optimization
/* eslint-disable security/detect-object-injection -- Using controlled keys from IMAGE_SIZES constant */
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sanitizeStoragePath } from "@/lib/supabase/storage-utils";

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
const INTERNAL_SERVER_ERROR = "Internal server error";
const INVALID_BUCKET = "Invalid bucket";
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

  return sharp(buffer)
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
  if (!file) return { valid: false, error: "No file provided" };
  if (!file.type.startsWith("image/")) return { valid: false, error: "File must be an image" };
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: "File too large (max 10MB)" };
  return { valid: true };
}

/**
 * Common auth + file validation for upload handlers
 */
async function getAuthenticatedFile(request: NextRequest): Promise<
  | { ok: true; userId: string; file: File; buffer: Buffer; searchParams: URLSearchParams }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const userId = await validateAuth(supabase);
  if (!userId) {
    return { ok: false, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
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
          contentType: "image/webp",
          cacheControl: "31536000",
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

/**
 * POST /api/upload
 * 이미지 업로드 및 최적화
 */
export async function POST(request: NextRequest): Promise<NextResponse<UploadResult>> {
  try {
    const auth = await getAuthenticatedFile(request);
    if (!auth.ok) return auth.response as NextResponse<UploadResult>;

    const bucket = auth.searchParams.get("bucket") ?? "portfolios";
    if (!validateBucket(bucket)) {
      return NextResponse.json({ success: false, error: INVALID_BUCKET }, { status: 400 }) as NextResponse<UploadResult>;
    }
    const folder = auth.searchParams.get("folder") ?? "";
    if (folder && !sanitizeStoragePath(folder)) {
      return NextResponse.json({ success: false, error: "Invalid folder path" }, { status: 400 }) as NextResponse<UploadResult>;
    }
    const id = crypto.randomUUID();
    const basePath = folder ? `${folder}/${id}` : id;

    const result = await uploadAllSizes(auth.buffer, basePath, bucket);
    if (!result.paths) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, paths: result.paths as Record<ImageSize, string> });
  } catch {
    return NextResponse.json({ success: false, error: INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}

/**
 * PUT /api/upload
 * 단일 이미지 업로드 (아티스트 등록용)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthenticatedFile(request);
    if (!auth.ok) return auth.response;

    const bucket = auth.searchParams.get("bucket") ?? "portfolios";
    if (!validateBucket(bucket)) {
      return NextResponse.json({ success: false, error: INVALID_BUCKET }, { status: 400 });
    }
    const rawPath = auth.searchParams.get("path");
    if (!rawPath) {
      return NextResponse.json({ success: false, error: "Path is required" }, { status: 400 });
    }
    const path = sanitizeStoragePath(rawPath);
    if (!path) {
      return NextResponse.json({ success: false, error: "Invalid path" }, { status: 400 });
    }
    // 소유권 검증 — 타인 소유 경로 지정(IDOR) 차단. createAdminClient(RLS 우회)로 임의 경로에 쓰기 전 필수.
    if (!(await authorizePutUpload(bucket, path, auth.userId))) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // WebP로 변환 및 최적화
    const processedBuffer = await sharp(auth.buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Use admin client for Storage upload (bypasses RLS)
    // upsert:false — 신규 경로만 생성, 기존 파일 덮어쓰기(타인 파일 변조) 차단. 모든 호출처는 타임스탬프/UUID 로 새 경로 사용.
    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(path, processedBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error("Upload error:", err);
    return NextResponse.json({ success: false, error: INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}

// NOTE: DELETE 핸들러는 의도적으로 제거됨 (M9 감사).
// 호출처가 전혀 없는 dead code 였고, 소유권 검증 없이 createAdminClient(RLS 우회)로
// 임의 경로의 파일을 삭제할 수 있는 IDOR(CWE-639) 취약점이었다.
// 추후 이미지 삭제가 필요하면 버킷별 소유권 검증을 반드시 포함해 재구현할 것:
//   avatars/portfolios/before-after → 경로 prefix 의 artistId/userId 를 추출해
//   artists.user_id == 세션 userId (또는 profiles.id) 로 확인, banners/admin 계열은 requireAdmin().
