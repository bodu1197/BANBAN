// @client-reason: Fetches existing course data for editing
"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import CourseWriteClient from "../../../write/components/CourseWriteClient";
import type { CourseFormData } from "../../../write/components/CourseWriteClient";

function str(val: unknown, fallback = ""): string {
  return (val as string) ?? fallback;
}

function mapCourseToForm(
  course: Record<string, unknown>,
  images: Array<{ image_url: string }>,
  curriculum: Array<{ title: string }>,
): CourseFormData {
  const imgUrls = images.map((r) => r.image_url);
  const curTitles = curriculum.map((r) => r.title);
  return {
    title: str(course.title),
    description: str(course.description),
    location: str(course.location),
    duration: str(course.duration),
    classType: str(course.class_type, "OFFLINE"),
    category: str(course.category, "COMPREHENSIVE"),
    price: String(course.price ?? ""),
    originalPrice: course.original_price ? String(course.original_price) : "",
    curriculum: curTitles.length > 0 ? curTitles : [""],
    existingImageUrls: imgUrls,
  };
}

async function fetchCourseForEdit(courseId: string): Promise<CourseFormData | null> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: course } = await db.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (!course) return null;

  const [imgRes, curRes] = await Promise.all([
    db.from("course_images").select("image_url").eq("course_id", courseId).order("order_index"),
    db.from("course_curriculum").select("title").eq("course_id", courseId).order("chapter_number"),
  ]);

  return mapCourseToForm(
    course as Record<string, unknown>,
    (imgRes.data ?? []) as Array<{ image_url: string }>,
    (curRes.data ?? []) as Array<{ title: string }>,
  );
}

interface CourseEditClientProps {
    courseId: string;
}

export default function CourseEditClient({ courseId }: Readonly<CourseEditClientProps>): React.ReactElement {
  const router = useRouter();
  const { user, isArtist, isLoading: authLoading } = useAuth();

  const { data: courseData, isLoading } = useQuery({
    queryKey: ["course", "edit", courseId],
    queryFn: () => fetchCourseForEdit(courseId),
    enabled: !!user?.id,
  });

  if (authLoading || isLoading) return <FullPageSpinner />;
  if (!isArtist) {
    router.push("/login");
    return <FullPageSpinner />;
  }
  if (!courseData) {
    return <div className="py-16 text-center text-muted-foreground">수강을 찾을 수 없습니다.</div>;
  }

  return <CourseWriteClient mode="edit" initialData={courseData} courseId={courseId} />;
}
