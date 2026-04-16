import { redirect } from "next/navigation";

// /beauty-sim 은 일시 비공개 — 모든 진입을 /beauty-sim/my 로 리다이렉트.
// 페이지 컴포넌트와 lib/pages/beauty-sim-page.tsx, consumer-client.tsx 등 구현은
// 의도적으로 유지(완전 삭제 금지) — 추후 재공개 시 아래 import 와 본문 복원으로 즉시 부활 가능.
//
// import type { Metadata } from "next";
// import { renderBeautySimPage, generateBeautySimMetadata } from "@/lib/pages/beauty-sim-page";
// export const revalidate = 3600;
// export async function generateMetadata(): Promise<Metadata> { return generateBeautySimMetadata(); }

export default function Page(): never {
    redirect("/beauty-sim/my");
}
