import type { Metadata } from "next";
import { AiBeautyClient } from "@/components/beauty-sim/ai-test/ai-beauty-client";
import type { RecommendedArtist } from "@/components/beauty-sim/ai-test/ai-beauty-client";
import { fetchActiveArtists } from "@/lib/supabase/home-artist-queries";

export const revalidate = 300;

export const metadata: Metadata = {
    title: "AI 뷰티 시뮬레이션 (테스트)",
    description: "GPT AI로 눈썹/입술을 자연스럽게 제거하고 새로운 스타일을 시뮬레이션합니다.",
    robots: { index: false, follow: false },
};

export default async function Page(): Promise<React.ReactElement> {
    let artists: RecommendedArtist[] = [];
    try {
        const data = await fetchActiveArtists(6);
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

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            <AiBeautyClient artists={artists} />
        </main>
    );
}
