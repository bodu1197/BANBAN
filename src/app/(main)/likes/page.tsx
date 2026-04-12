import { renderLikesPage } from "@/lib/pages/likes-page";

export default async function Page(): Promise<React.ReactElement> {
  return renderLikesPage();
}
