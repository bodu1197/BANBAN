import { SegmentQueryProvider } from "@/providers/SegmentQueryProvider";

export default function ArtistsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <SegmentQueryProvider>{children}</SegmentQueryProvider>;
}
