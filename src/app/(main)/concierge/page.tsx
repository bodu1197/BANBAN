import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/seo";

export const metadata: Metadata = {
  title: "반언니 비서실",
  description: "반언니 비서실 — 반영구 메이크업 전문 상담 서비스",
  ...buildPageSeo({
    title: "반언니 비서실",
    description: "반언니 비서실 — 반영구 메이크업 전문 상담 서비스",
    path: "/concierge",
  }),
};

export default function ConciergePage(): React.ReactElement {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1024px] px-4 py-16">
      <h1 className="text-2xl font-bold">반언니 비서실</h1>
      <p className="mt-4 text-muted-foreground">준비 중입니다.</p>
    </main>
  );
}
