import { permanentRedirect } from "next/navigation";

// 백과사전을 커뮤니티 '뷰티랩' 탭 아래로 일원화 — 단독 진입점(/encyclopedia 리스트)은 커뮤니티로 보냄.
// 개별 글은 /encyclopedia/[slug] 에서 그대로 읽힘(뷰티랩 카드가 링크).
// 영구 이동(308)이어야 한다: 임시(307)로 두면 구글이 /encyclopedia 를 색인에 남긴 채 커뮤니티 내용을
// 그 주소로 보여 준다(2026-09-20 검색결과에서 실측 — "banunni.com › encyclopedia · 커뮤니티 | 반언니").
export default function Page(): never {
  permanentRedirect("/community?tab=beautylab");
}
