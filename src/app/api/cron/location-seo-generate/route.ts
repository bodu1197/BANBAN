import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cronAuthError } from "@/lib/cron-auth";
import { runLocationSeoGeneration } from "@/lib/location-seo/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  // ?target="서울 강남구|눈썹" 으로 특정 조합 강제 생성 가능. 없으면 다음 미발행 1건.
  const target = request.nextUrl.searchParams.get("target");
  const result = await runLocationSeoGeneration(target && target.trim() ? target.trim() : null);

  if ("done" in result) {
    return NextResponse.json(result, { status: 200 });
  }
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
