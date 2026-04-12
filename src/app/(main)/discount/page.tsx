import type { Metadata } from "next";
import { renderDiscountPage, generateDiscountMetadata } from "@/lib/pages/discount-page";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return generateDiscountMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderDiscountPage();
}
