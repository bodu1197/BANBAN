import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/seo";
import { ProBeautySimClientV2 } from "@/components/beauty-sim/pro/pro-client-v2";

const SEO_TITLE = "눈썹 블러 실험 (V2) - 반언니";
const SEO_DESCRIPTION =
    "자연 눈썹 블러와 템플릿 오버레이를 결합한 차세대 반영구 시뮬레이션 실험 페이지. 원장님 상담 도구의 정밀도와 비포/애프터 표현력을 한 단계 끌어올리는 새로운 기능을 가장 먼저 미리 체험하고 개선 피드백을 남겨보세요.";

export const metadata: Metadata = {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    keywords: ["눈썹 블러", "반영구 V2", "반영구 템플릿", "원장 상담 도구"],
    robots: { index: false, follow: false },
    ...buildPageSeo({
        title: SEO_TITLE,
        description: SEO_DESCRIPTION,
        path: "/pro/beauty-sim/v2",
    }),
};

export default function Page(): React.ReactElement {
    return (
        <main className="flex h-screen w-full flex-col overflow-hidden bg-black text-white">
            <ProBeautySimClientV2 />
        </main>
    );
}
