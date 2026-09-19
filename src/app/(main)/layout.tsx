import dynamic from "next/dynamic";
import { Header, Footer } from "@/components/layout";
import { getOrganizationJsonLd, getWebsiteJsonLd, jsonLdSafe } from "@/lib/seo";

const BottomNav = dynamic(() => import("@/components/layout/BottomNav").then(m => m.BottomNav));
const IdleToaster = dynamic(() => import("@/components/layout/IdleToaster").then(m => m.IdleToaster));

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  // 두 블록을 함께 낸다: WebSite.publisher 가 Organization 의 @id 를 가리키므로, Organization 이 없는
  // 페이지에서는 그 참조가 비게 된다(홈에서만 내던 시절의 결함).
  const websiteJsonLd = getWebsiteJsonLd();
  const organizationJsonLd = getOrganizationJsonLd();

  return (
    <div lang="ko" className="flex min-h-screen flex-col bg-muted">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(organizationJsonLd) }}
      />
      <Header />
      <main id="main-content" className="flex-1 pb-16">
        <div className="mx-auto w-full max-w-[1024px] bg-background lg:rounded-t-[32px] overflow-clip">
          {children}
        </div>
      </main>
      <Footer />
      <BottomNav />
      <IdleToaster />
    </div>
  );
}
