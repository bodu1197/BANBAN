import type { Metadata } from "next";
import { redirect } from "next/navigation";

// 커뮤니티 메뉴 보류 — 본문 페이지 비활성. Google 이 redirect 따라가서 홈을 중복
// 인덱싱하는 것을 차단하기 위해 noindex 메타 + sitemap 에서도 제외 (static.xml).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page(): never {
  redirect("/");
}
