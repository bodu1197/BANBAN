import type { Metadata } from "next";
import { renderCoursesPage, generateCoursesMetadata } from "@/lib/pages/courses-page";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
    return generateCoursesMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
    return renderCoursesPage();
}
