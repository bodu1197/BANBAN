// @client-reason: 입력 중인 소개글을 실시간 구글 검색 스니펫 미리보기로 반영 (loss-aversion)
"use client";

import { Sparkles, Search } from "lucide-react";

const SNIPPET_MAX = 110;
const TARGET_LEN = 100;

function toSnippet(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > SNIPPET_MAX ? `${flat.slice(0, SNIPPET_MAX)}…` : flat;
}

interface IntroduceSeoPreviewProps {
  shopName: string;
  introduce: string;
  region: string;
  imageCount: number;
}

export function IntroduceSeoPreview({
  shopName, introduce, region, imageCount,
}: Readonly<IntroduceSeoPreviewProps>): React.ReactElement {
  const snippet = toSnippet(introduce);
  const len = introduce.trim().length;
  const rich = len >= TARGET_LEN;
  const name = shopName.trim() || "내 샵 이름";
  const regionLabel = region.trim() || "지역";

  return (
    <div className="space-y-3">
      {/* 정성작성 안내문 (사실 근거만 — '보장' 표현 없음) */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> 왜 정성껏 써야 할까요?
        </p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-amber-800">
          <li>· 여기 적은 소개가 <b>구글·네이버 검색 결과에 그대로 노출</b>됩니다</li>
          <li>· 챗GPT·퍼플렉시티 같은 <b>AI가 가게를 설명할 때 이 소개를 참고</b>해요</li>
          <li>· 곧 <b>반언니 공식 인스타그램</b>에도 소개될 예정이에요</li>
        </ul>
        <p className="mt-2 text-xs font-semibold text-amber-900">정성껏 쓴 소개가 오래오래 고객을 불러옵니다.</p>
      </div>

      {/* 실시간 구글 검색 스니펫 미리보기 */}
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Search className="h-3.5 w-3.5" aria-hidden="true" /> 구글 검색에 이렇게 노출돼요 (실시간)
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground">banunni.com › 아티스트 › {regionLabel}</p>
          <p className="mt-0.5 line-clamp-1 text-base font-medium text-blue-700">{name} | 반언니</p>
          {snippet ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{snippet}</p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-red-600">소개가 비어 있어 검색에 거의 노출되지 않아요. 아래 질문에 답해 주세요.</p>
          )}
        </div>
        <p className={`mt-2 text-xs font-medium ${rich ? "text-green-600" : "text-amber-700"}`}>
          {rich
            ? "✓ 검색 노출 준비 완료 — 더 채울수록 더 잘 노출돼요!"
            : `아직 ${TARGET_LEN - len}자 더 채우면 검색 노출에 유리해요 (${len}/${TARGET_LEN}자)`}
        </p>
        {imageCount === 0 ? (
          <p className="mt-1 text-xs text-amber-700">· 대표 사진을 올리면 검색·목록에서 훨씬 눈에 띕니다</p>
        ) : null}
      </div>
    </div>
  );
}
