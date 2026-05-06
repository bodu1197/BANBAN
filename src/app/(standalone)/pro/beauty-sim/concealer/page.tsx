import type { Metadata } from "next";
import { ConcealerClient } from "@/components/beauty-sim/pro/concealer-client";

export const metadata: Metadata = {
    title: "눈썹 컨실러 - 반언니",
    description: "자연 눈썹을 지워서 깨끗한 사진을 만드세요",
};

export default function Page(): React.ReactElement {
    return (
        <main className="h-screen w-full overflow-hidden bg-background">
            <ConcealerClient />
        </main>
    );
}
