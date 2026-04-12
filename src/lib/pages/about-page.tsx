import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";

export async function generateAboutMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.about,
    description: STRINGS.pages.aboutDesc,
    alternates: getAlternates("/about"),
  };
}

export async function renderAboutPage(): Promise<React.ReactElement> {
  const f = STRINGS.footer;

  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{STRINGS.pages.about}</h1>

      <section className="mb-8 rounded-lg border p-6">
        <p className="whitespace-pre-wrap leading-relaxed text-foreground">
          {STRINGS.pages.aboutContent}
        </p>
      </section>

      <section className="space-y-3 rounded-lg bg-muted/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">{STRINGS.pages.contact}</h2>
        <p className="text-sm text-muted-foreground">{f.companyName}</p>
        <p className="text-sm text-muted-foreground">{f.companyAddress}</p>
        <p className="text-sm text-muted-foreground">{f.companyContact}</p>
        <p className="text-sm text-muted-foreground">{f.companyRefund}</p>
        <p className="text-sm text-muted-foreground">{f.companyResponsibility}</p>
        <p className="text-sm text-muted-foreground">{f.companyComplaint}</p>
      </section>
    </main>
  );
}
