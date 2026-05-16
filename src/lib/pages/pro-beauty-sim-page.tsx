import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/seo";
import { ProBeautySimClient } from "@/components/beauty-sim/pro/pro-client";

const SEO_TITLE = "원장님 전용 상담 도구";
const SEO_DESCRIPTION =
    "반영구 원장님 전용 상담 도구 — 황금비율 스마트 룰러와 눈썹·입술 실시간 시뮬레이션 기능을 제공합니다. 고객 상담 시 즉석에서 비포/애프터를 보여주고 시술 동의율을 높이는 전문 시각적 컨설팅 도구로 매출 향상에 기여합니다.";

export async function generateProBeautySimMetadata(): Promise<Metadata> {
    return {
        title: SEO_TITLE,
        description: SEO_DESCRIPTION,
        keywords: ["반영구 상담 도구", "반영구 시뮬레이션", "황금비율", "반영구 원장 도구"],
        ...buildPageSeo({
            title: SEO_TITLE,
            description: SEO_DESCRIPTION,
            path: "/pro/beauty-sim",
        }),
    };
}

export async function renderProBeautySimPage(): Promise<React.ReactElement> {
    return (
        <main className="flex h-screen w-full flex-col overflow-hidden bg-background">
            <ProBeautySimClient />
        </main>
    );
}
