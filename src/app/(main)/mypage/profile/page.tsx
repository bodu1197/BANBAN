import { renderProfilePage } from "@/lib/pages/profile-page";

export default async function Page(): Promise<React.ReactElement> {
  return renderProfilePage();
}
