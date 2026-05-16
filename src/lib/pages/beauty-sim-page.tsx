import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/seo";
import { ConsumerBeautySimClient } from "@/components/beauty-sim/consumer/consumer-client";

const SEO_TITLE = "눈썹문신 시뮬레이션 - 내 얼굴에 맞는 스타일 찾기";
const SEO_DESCRIPTION =
    "눈썹문신 시뮬레이션으로 헤어스트록, 엠보, 콤보, 쉐도우 등 다양한 반영구 눈썹 스타일을 내 얼굴에 미리 적용해보세요. 입술 컬러 20색 시뮬레이션, 위치별 비교, 황금비율 가이드까지 무료로 체험할 수 있는 AI 도구입니다.";

export async function generateBeautySimMetadata(): Promise<Metadata> {
    return {
        title: SEO_TITLE,
        description: SEO_DESCRIPTION,
        keywords: ["눈썹문신 시뮬레이션", "반영구 시뮬레이션", "헤어스트록", "엠보", "쉐도우", "입술 컬러"],
        ...buildPageSeo({
            title: SEO_TITLE,
            description: SEO_DESCRIPTION,
            path: "/beauty-sim",
        }),
    };
}

export async function renderBeautySimPage(): Promise<React.ReactElement> {
    return (
        <main className="min-h-screen bg-black">
            <ConsumerBeautySimClient />
        </main>
    );
}
