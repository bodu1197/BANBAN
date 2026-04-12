import type { Metadata } from "next";
import {
    renderCourseDetailPage,
    generateCourseDetailMetadata,
} from "@/lib/pages/course-detail-page";

export const revalidate = 120;

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    return generateCourseDetailMetadata(id);
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
    const { id } = await params;
    return renderCourseDetailPage(id);
}
