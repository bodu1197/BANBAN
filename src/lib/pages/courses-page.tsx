import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GraduationCap, Layers, BookOpen, Zap } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo } from "@/lib/seo";
import { fetchCourseList, type CourseListItem } from "@/lib/supabase/course-queries";

const t = STRINGS.courseDetail;

const SEO_DESCRIPTION =
  "베테랑 아티스트가 직접 가르치는 반영구 수강 정보 — 종합반, 단과반, 원데이 클래스까지 지역과 가격으로 비교하고 내 일정에 맞는 반영구 교육 과정을 찾아보세요.";

export async function generateCoursesMetadata(): Promise<Metadata> {
    return {
        title: t.courseList,
        description: SEO_DESCRIPTION,
        keywords: ["반영구 수강", "반영구 교육", "반영구 학원", "반영구 원데이", "반영구 자격증"],
        ...buildPageSeo({
            title: t.courseList,
            description: SEO_DESCRIPTION,
            path: "/courses",
        }),
    };
}

export async function renderCoursesPage(): Promise<React.ReactElement> {
    const courses = await fetchCourseList();

    return (
        <div className="mx-auto w-full max-w-[767px]">
            <CategoryIcons />
            <CourseListSection courses={courses} />
        </div>
    );
}

function CategoryIcons(): React.ReactElement {
    const categories = [
        { label: t.allCategories, icon: GraduationCap },
        { label: t.comprehensive, icon: Layers },
        { label: t.singleSubject, icon: BookOpen },
        { label: t.oneday, icon: Zap },
    ];

    return (
        <nav className="flex justify-around border-b border-border px-4 py-5" aria-label="Course categories">
            {categories.map((cat) => (
                <CategoryIcon key={cat.label} label={cat.label} icon={cat.icon} />
            ))}
        </nav>
    );
}

function CategoryIcon({ label, icon: Icon }: Readonly<{
    label: string;
    icon: typeof GraduationCap;
}>): React.ReactElement {
    return (
        <button
            type="button"
            className="flex flex-col items-center gap-1.5 rounded-lg p-1 text-center transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
}

function CourseListSection({ courses }: Readonly<{
    courses: CourseListItem[];
}>): React.ReactElement {
    return (
        <section className="px-4 py-4">
            <p className="mb-2 text-sm font-bold">{t.filterSubtitle}</p>
            <p className="mb-4 text-xs text-muted-foreground">
                {t.totalCount.replace("{count}", String(courses.length))}
            </p>
            {courses.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">{t.noCourses}</p>
            ) : (
                <ul className="divide-y divide-border">
                    {courses.map((course) => (
                        <li key={course.id}>
                            <CourseCard course={course} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function CourseCard({ course }: Readonly<{
    course: CourseListItem;
}>): React.ReactElement {
    return (
        <Link
            href={`/courses/${course.id}`}
            className="flex gap-3 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted md:h-24 md:w-24">
                {course.imageUrl ? (
                    <Image src={course.imageUrl} alt={course.title} fill sizes="96px" className="object-cover" loading="lazy" />
                ) : null}
            </div>
            <div className="flex flex-1 flex-col justify-between overflow-hidden">
                <div>
                    <h2 className="truncate text-sm font-bold text-brand-primary">{course.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {course.location} | {course.duration}
                    </p>
                </div>
                <CourseCardPrice course={course} />
            </div>
        </Link>
    );
}

function CourseCardPrice({ course }: Readonly<{
    course: CourseListItem;
}>): React.ReactElement {
    return (
        <div className="mt-1 flex items-center gap-2">
            {course.discountRate > 0 && (
                <span className="text-sm font-bold text-red-500">{course.discountRate}%</span>
            )}
            <span className="text-sm font-bold">{t.pricePerMonth} {course.price}{t.tenThousandWon}</span>
            {course.originalPrice && course.discountRate > 0 ? (
                <span className="text-xs text-muted-foreground line-through">
                    {t.pricePerMonth} {course.originalPrice}{t.tenThousandWon}
                </span>
            ) : null}
        </div>
    );
}
