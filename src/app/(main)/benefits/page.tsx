import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { getAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "혜택모음 - 반언니",
  description: "반언니에서 제공하는 다양한 혜택을 한곳에서 확인하세요.",
  alternates: getAlternates("/benefits"),
};

export default function Page(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-[767px] flex-col items-center justify-center px-4 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10">
        <Gift className="h-8 w-8 text-brand-primary" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl font-bold">혜택모음</h1>
      <p className="mt-3 text-center text-muted-foreground">
        준비 중인 페이지입니다.
        <br />
        곧 다양한 혜택으로 찾아뵙겠습니다.
      </p>
    </main>
  );
}
