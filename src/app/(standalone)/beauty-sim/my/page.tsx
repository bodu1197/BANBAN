import type { Metadata } from "next";
import { renderMyFittingPage, generateMyFittingMetadata } from "@/lib/pages/my-fitting-page";

export async function generateMetadata(): Promise<Metadata> {
    return generateMyFittingMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
    return renderMyFittingPage();
}
