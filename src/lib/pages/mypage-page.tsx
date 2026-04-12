import { MyPageClient } from "@/app/(main)/mypage/MyPageClient";

export async function renderMyPage(): Promise<React.ReactElement> {
  return <MyPageClient />;
}
