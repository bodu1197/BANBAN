import { renderReviewsPage, generateReviewsMetadata } from "@/lib/pages/reviews-page";

export const revalidate = 60;

export async function generateMetadata(): ReturnType<typeof generateReviewsMetadata> {
    return generateReviewsMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
    return renderReviewsPage();
}
