import { QueryProvider } from "@/providers/QueryProvider";

export default function EventsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <QueryProvider>{children}</QueryProvider>;
}
