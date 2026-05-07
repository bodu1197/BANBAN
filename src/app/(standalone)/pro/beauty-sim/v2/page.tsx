import type { Metadata } from "next";
import { ProBeautySimClientV2 } from "@/components/beauty-sim/pro/pro-client-v2";

export const metadata: Metadata = {
    title: "눈썹 블러 실험 (V2) - 반언니",
    description: "자연 눈썹 블러 + 템플릿 오버레이 실험 페이지",
};

export default function Page(): React.ReactElement {
    return (
        <main className="flex h-screen w-full flex-col overflow-hidden bg-black text-white">
            <ProBeautySimClientV2 />
        </main>
    );
}
