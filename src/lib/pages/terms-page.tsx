import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";

export async function generateTermsMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.terms,
    description: STRINGS.pages.terms,
    alternates: getAlternates("/terms"),
  };
}

export async function renderTermsPage(): Promise<React.ReactElement> {
  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{STRINGS.pages.terms}</h1>

      <article className="prose prose-sm max-w-none rounded-lg border p-6">
        <div className="whitespace-pre-wrap leading-relaxed">
          {STRINGS.pages.termsContent}
        </div>
      </article>
    </main>
  );
}
