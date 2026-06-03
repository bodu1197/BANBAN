import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ArtistNotFound(): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        아티스트를 찾을 수 없습니다
      </p>
      <Button asChild className="mt-6">
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </div>
  );
}
