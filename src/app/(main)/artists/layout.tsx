import { QueryProvider } from "@/providers/QueryProvider";

export default function ArtistsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <QueryProvider>{children}</QueryProvider>;
}
