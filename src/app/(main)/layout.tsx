import dynamic from "next/dynamic";
import { Header, Footer } from "@/components/layout";
import { getWebsiteJsonLd, jsonLdSafe } from "@/lib/seo";

const BottomNav = dynamic(() => import("@/components/layout/BottomNav").then(m => m.BottomNav));
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
