import CourseListClient from "@/app/(main)/mypage/artist/courses/components/CourseListClient";

export async function renderArtistCoursesPage(): Promise<React.ReactElement> {
  return (
    <div className="mypage-inner">
      <CourseListClient />
    </div>
  );
}
