import type { Metadata } from "next";
import { renderRefundPolicyPage, generateRefundPolicyMetadata } from "@/lib/pages/refund-policy-page";

export async function generateMetadata(): Promise<Metadata> {
  return generateRefundPolicyMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderRefundPolicyPage();
}
