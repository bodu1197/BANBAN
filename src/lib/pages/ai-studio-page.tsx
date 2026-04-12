import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { AiStudioClient } from "@/components/ai-studio/ai-studio-client";

export async function generateAiStudioMetadata(): Promise<Metadata> {
  return {
    title: "타투 유사 작품 찾기 - HowTattoo",
    description: "타투 사진으로 유사한 작품을 검색하세요.",
  };
}

export async function renderAiStudioPage(): Promise<React.ReactElement> {
  return (
    <main className="mx-auto min-h-screen max-w-[767px] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4">
        <Link
          href="/"
          className="rounded-full p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={STRINGS.common.goBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-purple-500" />
          <h1 className="text-lg font-semibold">유사 작품 찾기</h1>
        </div>
      </div>

      <AiStudioClient />
    </main>
  );
}
