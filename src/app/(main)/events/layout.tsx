import { SegmentQueryProvider } from "@/providers/SegmentQueryProvider";

export default function EventsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <SegmentQueryProvider>{children}</SegmentQueryProvider>;
}
