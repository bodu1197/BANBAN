import { SegmentQueryProvider } from "@/providers/SegmentQueryProvider";

export default function MyPageLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <SegmentQueryProvider>{children}</SegmentQueryProvider>;
}
