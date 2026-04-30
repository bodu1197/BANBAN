import type { Metadata } from "next";
import { Phone, Mail, Clock } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { ContactInfoCard } from "@/components/shared/ContactInfoCard";

export async function generateContactMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.contact,
    description: STRINGS.pages.contactDesc,
    alternates: getAlternates("/contact"),
  };
}

export async function renderContactPage(): Promise<React.ReactElement> {
  const f = STRINGS.footer;

  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold">{STRINGS.pages.contact}</h1>
      <p className="mb-8 text-muted-foreground">{STRINGS.pages.contactDesc}</p>

      <div className="grid gap-4 md:grid-cols-3">
        <ContactInfoCard icon={Phone} label={STRINGS.pages.contactPhone.split(":")[0]} value="010-8699-6664" />
        <ContactInfoCard icon={Mail} label={STRINGS.pages.contactEmail.split(":")[0]} value="howtattoo@banunni.com" />
        <ContactInfoCard
          icon={Clock}
          label={STRINGS.pages.contactHours.split(":")[0]}
          value={STRINGS.pages.contactHours.split(": ").slice(1).join(": ")}
        />
      </div>

      <section className="mt-8 space-y-2 rounded-lg bg-muted/50 p-6">
        <p className="text-sm text-muted-foreground">{f.companyName}</p>
        <p className="text-sm text-muted-foreground">{f.companyAddress}</p>
        <p className="text-sm text-muted-foreground">{f.companyRefund}</p>
        <p className="text-sm text-muted-foreground">{f.companyComplaint}</p>
      </section>
    </main>
  );
}
