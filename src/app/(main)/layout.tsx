import dynamic from "next/dynamic";
import { Header, Footer, BottomNav } from "@/components/layout";
import { getWebsiteJsonLd, jsonLdSafe } from "@/lib/seo";

// QueryProvider 는 home 등 react-query 미사용 페이지에서 import 안 함.
// 필요한 segment 는 자체 layout.tsx 에서 SegmentQueryProvider 로 wrap.
const IdleToaster = dynamic(() => import("@/components/layout/IdleToaster").then(m => m.IdleToaster));

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const websiteJsonLd = getWebsiteJsonLd();

  return (
    <div lang="ko" className="flex min-h-screen flex-col bg-muted">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(websiteJsonLd) }}
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
