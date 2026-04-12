// @client-reason: Manages course list state, delete mutations
"use client";

import { STRINGS } from "@/lib/strings";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";

interface CourseItem {
  id: string;
  title: string;
  category: string;
  price: number;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
}

async function fetchOwnedCourses(userId: string): Promise<CourseItem[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- courses not in generated types
  const db = supabase as any;

  const { data, error } = await db
    .from("courses")
    .select("id, title, category, price, is_active, created_at")
    .eq("artist_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const courses = (data ?? []) as Array<{
    id: string; title: string; category: string;
    price: number; is_active: boolean; created_at: string;
  }>;

  const result: CourseItem[] = [];
  for (const c of courses) {
    const { data: img } = await db
      .from("course_images")
      .select("image_url")
      .eq("course_id", c.id)
      .order("order_index")
      .limit(1)
      .maybeSingle();

    result.push({
      id: c.id,
      title: c.title,
      category: c.category,
      price: c.price,
      isActive: c.is_active,
      imageUrl: (img as { image_url: string } | null)?.image_url ?? null,
      createdAt: c.created_at,
    });
  }
  return result;
}

async function deleteCourse(courseId: string): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Delete related data first
  await Promise.all([
    db.from("course_images").delete().eq("course_id", courseId),
    db.from("course_highlights").delete().eq("course_id", courseId),
    db.from("course_curriculum").delete().eq("course_id", courseId),
  ]);
  const { error } = await db.from("courses").delete().eq("id", courseId);
  if (error) throw error;
}

const CATEGORY_LABELS: Record<string, string> = {
  COMPREHENSIVE: "종합",
  MACHINE: "머신",
  DRAWING: "드로잉",
  OTHER: "기타",
};

function formatPrice(price: number): string {
  return `${price.toLocaleString()}원`;
}

function CourseCard({ course, onDelete }: Readonly<{
  course: CourseItem;
    onDelete: (id: string) => void;
}>): React.ReactElement {
  return (
    <li className="flex gap-3 border-b py-3">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {course.imageUrl ? (
          <Image src={course.imageUrl} alt={course.title} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No Image</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary">
              {CATEGORY_LABELS[course.category] ?? course.category}
            </span>
            {!course.isActive && (
              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">비활성</span>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-semibold">{course.title}</p>
          <p className="text-xs text-muted-foreground">{formatPrice(course.price)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/mypage/artist/courses/edit/${course.id}`}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${course.title} 수정`}
          >
            <Pencil className="h-3.5 w-3.5" />
            수정
          </Link>
          <button
            type="button"
            onClick={() => onDelete(course.id)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${course.title} 삭제`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
        </div>
      </div>
    </li>
  );
}
function CourseListContent({ courses, onDelete }: Readonly<{
  courses: CourseItem[]; onDelete: (id: string) => void;
}>): React.ReactElement {
  const writeHref = "/mypage/artist/courses/write";
  const btnClass = "flex items-center gap-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{STRINGS.common.all} {courses.length.toLocaleString()}</p>
        <Link href={writeHref} className={btnClass}><Plus className="h-4 w-4" />수강 등록</Link>
      </div>
      {courses.length > 0 ? (
        <ul className="space-y-0">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onDelete={onDelete} />
          ))}
        </ul>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          <p className="mb-4">{STRINGS.common.noData}</p>
          <Link href={writeHref} className={`inline-${btnClass}`}><Plus className="h-4 w-4" />첫 수강을 등록해보세요</Link>
        </div>
      )}
    </div>
  );
}

export default function CourseListClient(): React.ReactElement {
  const router = useRouter();
  const { user, isArtist, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", "owned", user?.id],
    queryFn: () => fetchOwnedCourses(user?.id as string),
    enabled: !!user?.id,
  });

  const handleDelete = async (courseId: string): Promise<void> => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteCourse(courseId);
      alert("삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["courses", "owned"] });
    } catch { alert("삭제에 실패했습니다."); }
  };

  if (authLoading || isLoading) return <FullPageSpinner />;
  if (!isArtist) { router.push("/login"); return <FullPageSpinner />; }

  return <CourseListContent courses={courses ?? []} onDelete={handleDelete} />;
}
