import dynamic from "next/dynamic";
import { Header, Footer, BottomNav } from "@/components/layout";
import { getWebsiteJsonLd, jsonLdSafe } from "@/lib/seo";

const QueryProvider = dynamic(() => import("@/providers/QueryProvider").then(m => m.QueryProvider));
const IdleToaster = dynamic(() => import("@/components/layout/IdleToaster").then(m => m.IdleToaster));

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const websiteJsonLd = getWebsiteJsonLd();

  return (
    <QueryProvider>
      {/* 바비톡 패턴 — outer 옅은 회색 바탕, 내부 1024px 흰색 컨테이너 (상단 32px 라운드) */}
      <div lang="ko" className="flex min-h-screen flex-col bg-[#F7F7F9]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(websiteJsonLd) }}
        />
        <Header />
        <div className="flex-1 pb-16">
          <div className="mx-auto w-full max-w-[1024px] bg-background lg:rounded-t-[32px] overflow-clip">
            {children}
          </div>
        </div>
        <Footer />
        <BottomNav />
        <IdleToaster />
      </div>
    </QueryProvider>
  );
}
