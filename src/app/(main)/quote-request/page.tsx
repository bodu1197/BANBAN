import type { Metadata } from "next";
import { renderQuoteRequestPage, generateQuoteRequestMetadata } from "@/lib/pages/quote-request-page";

export async function generateMetadata(): Promise<Metadata> {
  return generateQuoteRequestMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderQuoteRequestPage();
}
