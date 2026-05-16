import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildPageSeo, getBreadcrumbJsonLd, getCourseJsonLd, getCanonicalUrl, jsonLdSafe } from "@/lib/seo";
import { fetchCourseById, type CourseDetail } from "@/lib/supabase/course-queries";
import { CourseDetailClient } from "@/components/course/CourseDetailClient";

export async function generateCourseDetailMetadata(id: string): Promise<Metadata> {
    const course = await fetchCourseById(id);
    if (!course) return { title: "Course Not Found" };

    const title = `${course.title} - ${course.artistName}`;
    const description = course.description?.slice(0, 160) ?? `${course.category} 반영구 수강 — ${course.artistName} 직강. 커리큘럼, 가격, 일정을 확인하세요.`;
    const firstImage = course.images[0]?.imageUrl ?? null;

    return {
        title,
        description,
        ...buildPageSeo({
            title,
            description,
            path: `/courses/${id}`,
            image: firstImage,
        }),
    };
}

export async function renderCourseDetailPage(id: string): Promise<React.ReactElement> {
    const course = await fetchCourseById(id);

    if (!course) notFound();

    const breadcrumbJsonLd = getBreadcrumbJsonLd([
        { name: "홈", path: "" },
        { name: "수강", path: "/courses" },
        { name: course.title, path: `/courses/${id}` },
    ]);

    const courseJsonLd = getCourseJsonLd({
        name: course.title,
        description: course.description?.slice(0, 500) ?? `${course.category} 반영구 수강`,
        url: getCanonicalUrl(`/courses/${id}`),
        providerName: course.artistName,
        providerUrl: getCanonicalUrl(`/artists/${course.artistId}`),
        image: course.images[0]?.imageUrl,
    });

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdSafe(courseJsonLd) }}
            />
            <CourseDetailView course={course} />
        </>
    );
}

function CourseDetailView({ course }: Readonly<{
    course: CourseDetail;
}>): React.ReactElement {
    return <CourseDetailClient course={course} />;
}
