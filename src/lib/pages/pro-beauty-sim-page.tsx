import type { Metadata } from "next";
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
            <ProBeautySimClient />
        </main>
    );
}
