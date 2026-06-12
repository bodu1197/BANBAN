// 문신사법·국가시험 뉴스 자동수집 cron (vercel.json crons 가 호출).
// 인증(CRON_SECRET) → runStudyNewsCollect(수집·요약·tier분기·저장·색인통지).
import { NextResponse, type NextRequest } from "next/server";
import { cronAuthError } from "@/lib/cron-auth";
import { runStudyNewsCollect } from "@/lib/study-news/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;
  return NextResponse.json(await runStudyNewsCollect());
}
