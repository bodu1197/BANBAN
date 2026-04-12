import type { Metadata } from "next";
import { renderBeautySimPage, generateBeautySimMetadata } from "@/lib/pages/beauty-sim-page";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
    return generateBeautySimMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
    return renderBeautySimPage();
}
