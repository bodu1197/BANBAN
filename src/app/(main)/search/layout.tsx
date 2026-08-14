import { QueryProvider } from "@/providers/QueryProvider";

export default function SearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <QueryProvider>{children}</QueryProvider>;
}
