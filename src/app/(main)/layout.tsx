import dynamic from "next/dynamic";
import { Header, Footer, BottomNav } from "@/components/layout";
import { getWebsiteJsonLd } from "@/lib/seo";
import { getUser } from "@/lib/supabase/auth";

const QueryProvider = dynamic(() => import("@/providers/QueryProvider").then(m => m.QueryProvider));
const Toaster = dynamic(() => import("sonner").then(m => m.Toaster));

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  const user = await getUser();
  const websiteJsonLd = getWebsiteJsonLd();

  const headerUser = user ? {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.nickname ?? user.user_metadata?.name,
    avatarUrl: user.user_metadata?.avatar_url,
  } : null;

  return (
    <QueryProvider>
      <div lang="ko" className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Header user={headerUser} />
        <div className="flex-1 pb-16">{children}</div>
        <Footer />
        <BottomNav />
        <Toaster position="top-center" richColors />
      </div>
    </QueryProvider>
  );
}
