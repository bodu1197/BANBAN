import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";

export async function generatePrivacyMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.privacy,
    description: STRINGS.pages.privacy,
    alternates: getAlternates("/privacy"),
  };
}

export async function renderPrivacyPage(): Promise<React.ReactElement> {
  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{STRINGS.pages.privacy}</h1>

      <article className="prose prose-sm max-w-none rounded-lg border p-6">
        <div className="whitespace-pre-wrap leading-relaxed">
          {STRINGS.pages.privacyContent}
        </div>
      </article>
    </main>
  );
}
