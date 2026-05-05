import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { ProBeautySimClient } from "@/components/beauty-sim/pro/pro-client";

export async function generateProBeautySimMetadata(): Promise<Metadata> {
    return {
        title: "원장님 전용 상담 도구 - 반언니",
        description: "황금비율 스마트 룰러 + 눈썹/입술 실시간 시뮬레이션. 고객 앞에서 즉시 비포/애프터를 보여주세요.",
    };
}

export async function renderProBeautySimPage(): Promise<React.ReactElement> {
    return (
        <main className="mx-auto min-h-screen max-w-screen-2xl bg-background">
            <div className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-6">
                <Link
                    href="/"
                    className="rounded-full p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={STRINGS.common.goBack}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    <h1 className="text-lg font-semibold">원장님 상담 도구</h1>
                </div>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300">PRO</span>
            </div>

            <div className="p-6">
                <ProBeautySimClient />
            </div>
        </main>
    );
}
