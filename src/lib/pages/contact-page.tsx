import type { Metadata } from "next";
import { Phone, Mail, Clock, ShieldAlert } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo } from "@/lib/seo";
import { ContactInfoCard } from "@/components/shared/ContactInfoCard";

const SEO_DESCRIPTION =
  "반언니 고객센터 — 전화·이메일 문의 안내와 평일 운영시간(10:00~17:00). 부적절한 콘텐츠 신고, 환불·반품 관련 상담, 시술·아티스트 문의, 제휴 문의 등 모든 요청을 24시간 이내 검토하여 빠르게 답변드립니다.";

export async function generateContactMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.contact,
    description: SEO_DESCRIPTION,
    ...buildPageSeo({
      title: STRINGS.pages.contact,
      description: SEO_DESCRIPTION,
      path: "/contact",
    }),
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

      <section className="mt-8 rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h2 className="text-base font-bold">부적절한 콘텐츠 신고</h2>
        </div>
        <p className="mb-2 text-sm text-muted-foreground">
          불쾌하거나 부적절한 콘텐츠를 발견하셨나요? 각 게시글·포트폴리오의 신고 버튼을 이용하시거나,
          아래 이메일로 직접 신고해 주세요. 접수된 신고는 24시간 이내에 검토됩니다.
        </p>
        <p className="text-sm font-medium">신고 이메일: howtattoo@banunni.com</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>스팸, 광고성 콘텐츠</li>
          <li>욕설, 비방, 혐오 표현</li>
          <li>음란, 선정적 콘텐츠</li>
          <li>기타 이용약관 위반 사항</li>
        </ul>
      </section>

      <section className="mt-4 space-y-2 rounded-lg bg-muted/50 p-6">
        <p className="text-sm text-muted-foreground">{f.companyName}</p>
        <p className="text-sm text-muted-foreground">{f.companyAddress}</p>
        <p className="text-sm text-muted-foreground">{f.companyRefund}</p>
        <p className="text-sm text-muted-foreground">{f.companyComplaint}</p>
      </section>
    </main>
  );
}
