import { STRINGS } from "@/lib/strings";
import ReviewWriteClient from "@/app/(main)/reviews/write/ReviewWriteClient";

export async function generateReviewWriteMetadata(): Promise<{ title: string; description: string }> {
  return {
    title: `${STRINGS.review.pageTitle} - 타투어때`,
    description: STRINGS.review.pageDescription,
  };
}

export async function renderReviewWritePage(): Promise<React.ReactElement> {
  return (
    <main className="mx-auto min-h-screen max-w-[767px] bg-background pt-16 pb-24">
      <ReviewWriteClient />
    </main>
  );
}
