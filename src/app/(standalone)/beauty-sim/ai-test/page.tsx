import type { Metadata } from "next";
import { AiBeautyClient } from "@/components/beauty-sim/ai-test/ai-beauty-client";

export const metadata: Metadata = {
    title: "AI 뷰티 시뮬레이션 (테스트)",
    description: "GPT AI로 눈썹/입술을 자연스럽게 제거하고 새로운 스타일을 시뮬레이션합니다.",
    robots: { index: false, follow: false },
};

export default function Page(): React.ReactElement {
    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            <AiBeautyClient />
        </main>
    );
}
