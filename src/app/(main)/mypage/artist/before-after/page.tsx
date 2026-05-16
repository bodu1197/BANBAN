import type { Metadata } from "next";
import { BeforeAfterManagePage } from "./BeforeAfterManageClient";

export const metadata: Metadata = {
  title: "시술 전후 관리",
  robots: { index: false, follow: false },
};

export default function Page(): React.ReactElement {
  return <BeforeAfterManagePage />;
}
