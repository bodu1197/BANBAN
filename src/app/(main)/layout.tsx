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
      <div lang="ko" className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(websiteJsonLd) }}
        />
        <Header />
        <div className="flex-1 pb-16">{children}</div>
        <Footer />
        <BottomNav />
        <IdleToaster />
      </div>
    </QueryProvider>
  );
}
