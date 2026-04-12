import { renderArtistCourseEditPage } from "@/lib/pages/artist-course-edit-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({
  params,
}: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  return renderArtistCourseEditPage(id);
}
