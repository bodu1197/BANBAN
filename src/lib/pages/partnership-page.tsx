import type { Metadata } from "next";
import { Handshake, Mail, Phone } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { ContactInfoCard } from "@/components/shared/ContactInfoCard";

export async function generatePartnershipMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.partnership,
    description: STRINGS.pages.partnershipDesc,
    alternates: getAlternates("/partnership"),
  };
}

export async function renderPartnershipPage(): Promise<React.ReactElement> {
  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <div className="mb-8 flex items-center gap-3">
        <Handshake className="h-8 w-8 text-brand-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold">{STRINGS.pages.partnership}</h1>
      </div>

      <p className="mb-6 text-muted-foreground">{STRINGS.pages.partnershipDesc}</p>

      <section className="mb-8 rounded-lg border p-6">
        <p className="whitespace-pre-wrap leading-relaxed">
          {STRINGS.pages.partnershipContent}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ContactInfoCard
          icon={Phone}
          label={STRINGS.pages.contactPhone.split(":")[0]}
          value="010-8699-6664"
          className="rounded-lg bg-muted/50 p-5"
        />
        <ContactInfoCard
          icon={Mail}
          label={STRINGS.pages.contactEmail.split(":")[0]}
          value="howtattoo@howtattoo.com"
          className="rounded-lg bg-muted/50 p-5"
        />
      </section>
    </main>
  );
}
