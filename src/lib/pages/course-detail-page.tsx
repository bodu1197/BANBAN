import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAlternates } from "@/lib/seo";
import { fetchCourseById, type CourseDetail } from "@/lib/supabase/course-queries";
import { CourseDetailClient } from "@/components/course/CourseDetailClient";

export async function generateCourseDetailMetadata(id: string): Promise<Metadata> {
    const course = await fetchCourseById(id);
    if (!course) return { title: "Course Not Found" };

    return {
        title: `${course.title} - ${course.artistName}`,
        description: course.description?.slice(0, 160) ?? `${course.category} 타투 수강`,
        openGraph: {
            images: course.images[0]?.imageUrl ? [course.images[0].imageUrl] : [],
        },
        alternates: getAlternates(`/courses/${id}`),
    };
}

export async function renderCourseDetailPage(id: string): Promise<React.ReactElement> {
    const course = await fetchCourseById(id);

    if (!course) notFound();

    return <CourseDetailView course={course} />;
}

function CourseDetailView({ course }: Readonly<{
    course: CourseDetail;
}>): React.ReactElement {
    return <CourseDetailClient course={course} />;
}
