import { redirect } from "next/navigation";

// 백과사전을 커뮤니티 '뷰티랩' 탭 아래로 일원화 — 단독 진입점(/encyclopedia 리스트)은 커뮤니티로 보냄.
// 개별 글은 /encyclopedia/[slug] 에서 그대로 읽힘(뷰티랩 카드가 링크).
export default function Page(): never {
  redirect("/community?tab=beautylab");
}
