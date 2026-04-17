import type { Metadata } from "next";
import { MyFittingClient } from "@/components/beauty-sim/consumer/my-fitting-client";

export async function generateMyFittingMetadata(): Promise<Metadata> {
    return {
        title: "내 얼굴 피팅 - 눈썹 시뮬레이션 | 반언니",
        description: "내 사진으로 다양한 눈썹 스타일을 미리 체험해보세요. AI 얼굴 분석으로 최적의 위치에 눈썹을 시뮬레이션합니다.",
    };
}

export async function renderMyFittingPage(): Promise<React.ReactElement> {
    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            <MyFittingClient />
        </main>
    );
}
