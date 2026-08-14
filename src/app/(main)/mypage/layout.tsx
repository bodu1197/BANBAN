import { QueryProvider } from "@/providers/QueryProvider";

export default function MyPageLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <QueryProvider>{children}</QueryProvider>;
}
