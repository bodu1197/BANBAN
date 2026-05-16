import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/seo";
import { MyFittingClient } from "@/components/beauty-sim/consumer/my-fitting-client";

const SEO_TITLE = "내 얼굴 피팅 - 눈썹 시뮬레이션";
const SEO_DESCRIPTION =
    "내 사진으로 다양한 눈썹 스타일을 미리 체험해보세요. AI 얼굴 분석으로 최적의 위치에 눈썹을 시뮬레이션하고, 헤어스트록·엠보·쉐도우·콤보 등 인기 반영구 스타일을 한 번에 비교해 최적의 디자인을 찾을 수 있습니다.";

export async function generateMyFittingMetadata(): Promise<Metadata> {
    return {
        title: SEO_TITLE,
        description: SEO_DESCRIPTION,
        keywords: ["눈썹 피팅", "AI 얼굴 분석", "눈썹 시뮬레이션", "반영구 미리보기"],
        ...buildPageSeo({
            title: SEO_TITLE,
            description: SEO_DESCRIPTION,
            path: "/beauty-sim/my",
        }),
    };
}

export async function renderMyFittingPage(): Promise<React.ReactElement> {
    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            <MyFittingClient />
        </main>
    );
}
