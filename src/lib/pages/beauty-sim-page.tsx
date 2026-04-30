import type { Metadata } from "next";
import { ConsumerBeautySimClient } from "@/components/beauty-sim/consumer/consumer-client";

export async function generateBeautySimMetadata(): Promise<Metadata> {
    return {
        title: "눈썹문신 시뮬레이션 - 내 얼굴에 맞는 스타일 찾기 | 반언니",
        description: "눈썹문신 시뮬레이션으로 헤어스트록, 엠보, 쉐도우 등 다양한 반영구 눈썹 스타일을 내 얼굴에 미리 적용해보세요. 입술 컬러 20색 시뮬레이션 포함.",
    };
}

export async function renderBeautySimPage(): Promise<React.ReactElement> {
    return (
        <main className="min-h-screen bg-black">
            <ConsumerBeautySimClient />
        </main>
    );
}
