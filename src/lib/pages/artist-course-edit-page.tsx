import CourseEditClient from "@/app/(main)/mypage/artist/courses/edit/[id]/components/CourseEditClient";

export async function renderArtistCourseEditPage(courseId: string,
): Promise<React.ReactElement> {
  return (
    <div className="mypage-inner">
      <CourseEditClient courseId={courseId} />
    </div>
  );
}
