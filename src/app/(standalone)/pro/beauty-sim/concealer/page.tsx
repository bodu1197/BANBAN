import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/seo";
import { ConcealerClient } from "@/components/beauty-sim/pro/concealer-client";

const SEO_TITLE = "눈썹 컨실러 - 반언니";
const SEO_DESCRIPTION =
    "반영구 시술 전 자연 눈썹을 깨끗하게 지워 정확한 비포 사진을 만들어보세요. AI 눈썹 컨실러로 색감과 윤곽을 자동으로 정리해 시뮬레이션 정확도를 높이고 고객 상담의 신뢰도와 시술 동의율을 동시에 높이는 원장님 전용 도구입니다.";

export const metadata: Metadata = {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    keywords: ["눈썹 컨실러", "반영구 비포 사진", "AI 눈썹 제거", "반영구 시뮬레이션"],
    robots: { index: false, follow: false },
    ...buildPageSeo({
        title: SEO_TITLE,
        description: SEO_DESCRIPTION,
        path: "/pro/beauty-sim/concealer",
    }),
};

export default function Page(): React.ReactElement {
    return (
        <main className="h-screen w-full overflow-hidden bg-background">
            <ConcealerClient />
        </main>
    );
}
