// @client-reason: API Route for image upload and optimization
/* eslint-disable security/detect-object-injection -- Using controlled keys from IMAGE_SIZES constant */
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

  for (const size of sizes) {
    const processedBuffer = await processImage(buffer, size);
    const filePath = `${basePath}/${size}.webp`;

    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(filePath, processedBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      return { paths: null, error: `Failed to upload ${size}: ${uploadError.message}` };
    }

    paths[size] = filePath;
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
    const folder = auth.searchParams.get("folder") ?? "";
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
    const path = auth.searchParams.get("path");
    if (!path) {
      return NextResponse.json({ success: false, error: "Path is required" }, { status: 400 });
    }

    // WebP로 변환 및 최적화
    const processedBuffer = await sharp(auth.buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Use admin client for Storage upload (bypasses RLS)
    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(path, processedBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Upload error:", err);
    return NextResponse.json({ success: false, error: INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}

/**
 * DELETE /api/upload
 * 이미지 삭제
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const userId = await validateAuth(supabase);
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const bucket = searchParams.get("bucket") ?? "portfolios";
    const basePath = searchParams.get("path");

    if (!basePath) {
      return NextResponse.json({ success: false, error: "Path is required" }, { status: 400 });
    }

    const sizes = Object.keys(IMAGE_SIZES) as ImageSize[];
    const filesToDelete = sizes.map((size) => `${basePath}/${size}.webp`);

    // Use admin client for Storage delete (bypasses RLS)
    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient.storage
      .from(bucket)
      .remove(filesToDelete);

    if (deleteError) {
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
