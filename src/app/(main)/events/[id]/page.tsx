import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderEventDetailPage, generateEventMetadata } from "@/lib/pages/event-detail-page";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return generateEventMetadata(id);
}

export default async function Page({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params;
  const page = await renderEventDetailPage(id);
  if (!page) notFound();
  return page;
}
