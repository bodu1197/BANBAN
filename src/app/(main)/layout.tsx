import dynamic from "next/dynamic";
import { Header, Footer, BottomNav } from "@/components/layout";
import { getWebsiteJsonLd } from "@/lib/seo";

const QueryProvider = dynamic(() => import("@/providers/QueryProvider").then(m => m.QueryProvider));
const Toaster = dynamic(() => import("sonner").then(m => m.Toaster));

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const websiteJsonLd = getWebsiteJsonLd();

  return (
    <QueryProvider>
      <div lang="ko" className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Header />
        <div className="flex-1 pb-16">{children}</div>
        <Footer />
        <BottomNav />
        <Toaster position="top-center" richColors />
      </div>
    </QueryProvider>
  );
}
