import type { Metadata } from "next";
import {
  renderLocationListPage,
  generateLocationListMetadata,
} from "@/lib/pages/location-list-page";

export const revalidate = 300;

export function generateMetadata(): Metadata {
  return generateLocationListMetadata();
}

export default async function Page(): Promise<React.ReactElement> {
  return renderLocationListPage();
}
