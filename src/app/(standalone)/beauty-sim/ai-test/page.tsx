import type { Metadata } from "next";
import { AiBeautyClient } from "@/components/beauty-sim/ai-test/ai-beauty-client";
import type { RecommendedArtist } from "@/components/beauty-sim/ai-test/ai-beauty-client";
import { fetchNewArtists } from "@/lib/supabase/home-artist-queries";
import { buildPageSeo } from "@/lib/seo";

export const revalidate = 300;

const TITLE = "뷰티 시뮬레이션 | 반언니";
const DESCRIPTION = "내 얼굴에 어울리는 반영구 눈썹·입술 스타일을 미리 체험해보세요. 사진 한 장으로 다양한 시술 결과를 확인할 수 있습니다.";

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    ...buildPageSeo({
        title: TITLE,
        description: DESCRIPTION,
        path: "/beauty-sim/ai-test",
    }),
};

export default async function Page(): Promise<React.ReactElement> {
    let artists: RecommendedArtist[] = [];
    try {
        const data = await fetchNewArtists(6);
        artists = data.map((a) => ({
            id: a.id,
            title: a.title,
            introduce: a.introduce,
            profileImage: a.profileImage,
            regionName: a.regionName,
        }));
    } catch {
        // 아티스트 로딩 실패 시 빈 배열로 진행
    }

    // manual <link rel="preload">는 picture/source srcSet 과 정확히 매칭 안 되어
    // "preload but not used" 콘솔 경고 발생 (Chrome type="image/avif" 한계).
    // picture <img> 의 fetchPriority="high" 가 native 우선순위 처리 → preload 불필요.
    return (
        <main className="min-h-screen bg-gradient-to-b from-[#eef4ff] via-white to-[#eef4ff]/60">
            <AiBeautyClient artists={artists} />
        </main>
    );
}
