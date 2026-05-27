import type { Metadata } from "next";
import { renderHomePage, generateHomeMetadata } from "@/lib/pages/home-page";

// ISR 60초 — events admin route 의 revalidatePath('/') 와 짝.
// 이벤트 발행/수정 즉시 반영 + ISR 60초 안에 자동 갱신.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return generateHomeMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderHomePage();
}
