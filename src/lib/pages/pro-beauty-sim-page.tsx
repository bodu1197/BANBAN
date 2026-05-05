import type { Metadata } from "next";
import Link from "next/link";
import { X, Home, Sparkles } from "lucide-react";
import { ProBeautySimClient } from "@/components/beauty-sim/pro/pro-client";

export async function generateProBeautySimMetadata(): Promise<Metadata> {
    return {
        title: "원장님 전용 상담 도구 - 반언니",
        description: "황금비율 스마트 룰러 + 눈썹/입술 실시간 시뮬레이션. 고객 앞에서 즉시 비포/애프터를 보여주세요.",
    };
}

export async function renderProBeautySimPage(): Promise<React.ReactElement> {
    return (
        <main className="flex h-screen w-full flex-col overflow-hidden bg-background">
            <div className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <span className="text-sm font-semibold">원장님 상담 도구</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300">PRO</span>
                </div>
                <div className="flex items-center gap-1">
                    <Link
                        href="/"
                        className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="홈으로"
                    >
                        <Home className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/"
                        className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="닫기"
                    >
                        <X className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-4">
                <ProBeautySimClient />
            </div>
        </main>
    );
}
