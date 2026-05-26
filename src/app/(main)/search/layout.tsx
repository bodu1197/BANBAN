import { SegmentQueryProvider } from "@/providers/SegmentQueryProvider";

export default function SearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <SegmentQueryProvider>{children}</SegmentQueryProvider>;
}
