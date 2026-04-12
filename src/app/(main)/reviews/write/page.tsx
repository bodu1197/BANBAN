import { renderReviewWritePage, generateReviewWriteMetadata } from "@/lib/pages/review-write-page";

export async function generateMetadata(): Promise<{ title: string; description: string }> {
  return generateReviewWriteMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderReviewWritePage();
}
