import CourseWriteClient from "@/app/(main)/mypage/artist/courses/write/components/CourseWriteClient";

export async function renderArtistCourseWritePage(): Promise<React.ReactElement> {
  return (
    <div className="mypage-inner">
      <CourseWriteClient />
    </div>
  );
}
