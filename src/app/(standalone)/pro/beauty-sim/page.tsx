import type { Metadata } from "next";
import { renderProBeautySimPage, generateProBeautySimMetadata } from "@/lib/pages/pro-beauty-sim-page";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
    return generateProBeautySimMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
    return renderProBeautySimPage();
}
