import { createClient } from "./server";

export interface CourseDetail {
  id: string;
  artistId: string;
  title: string;
  description: string | null;
  location: string;
  duration: string;
  classType: string;
  category: string;
  price: number;
  originalPrice: number | null;
  discountRate: number;
  artistName: string;
  artistProfileImage: string | null;
  artistInstagram: string | null;
  artistIntroduce: string | null;
  artistKakaoUrl: string | null;
  artistContact: string | null;
  images: CourseImage[];
  highlights: CourseHighlight[];
  curriculum: CourseCurriculum[];
  reviews: CourseReview[];
  reviewSummary: ReviewSummary;
}

export interface CourseImage {
  imageUrl: string;
  orderIndex: number;
}

export interface CourseHighlight {
  orderIndex: number;
  title: string;
  description: string;
  imageUrl: string | null;
}

export interface CourseCurriculum {
  chapterNumber: number;
  title: string;
}

export interface CourseReview {
  id: string;
  userName: string;
  satisfaction: number;
  cleanliness: number;
  kindness: number;
  content: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  count: number;
  avgSatisfaction: number;
  avgCleanliness: number;
  avgKindness: number;
}

export interface CourseListItem {
  id: string;
  title: string;
  location: string;
  duration: string;
  classType: string;
  category: string;
  price: number;
  originalPrice: number | null;
  discountRate: number;
  artistName: string;
  imageUrl: string | null;
  reviewCount: number;
  avgRating: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- course tables not yet in generated Supabase types
type AnyClient = any;

interface CourseRow {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  location: string;
  duration: string;
  class_type: string;
  category: string;
  price: number;
  original_price: number | null;
  discount_rate: number;
}

interface ImageRow { image_url: string; order_index: number }
interface HighlightRow { order_index: number; title: string; description: string; image_url: string | null }
interface CurriculumRow { chapter_number: number; title: string }
interface ReviewRow { id: string; user_id: string; satisfaction: number; cleanliness: number; kindness: number; content: string | null; created_at: string }

async function fetchCourseRow(db: AnyClient, id: string): Promise<CourseRow | null> {
  const { data } = await db
    .from("courses").select("*").eq("id", id).eq("is_active", true).maybeSingle() as { data: CourseRow | null };
  return data;
}

async function fetchCourseRelations(supabase: Awaited<ReturnType<typeof createClient>>, db: AnyClient, id: string, artistId: string): Promise<{
  artistName: string; artistDetail: { profile_image_path: string | null; instagram_url: string | null; introduce: string | null; kakao_url: string | null; contact: string | null } | null;
  images: ImageRow[]; highlights: HighlightRow[]; curriculum: CurriculumRow[]; reviewList: CourseReview[]; summary: ReviewSummary;
}> {
  const [profileRes, imgRes, hlRes, curRes, revRes, artistRes] = await Promise.all([
    supabase.from("profiles").select("nickname").eq("id", artistId).maybeSingle(),
    db.from("course_images").select("image_url, order_index").eq("course_id", id).order("order_index"),
    db.from("course_highlights").select("order_index, title, description, image_url").eq("course_id", id).order("order_index"),
    db.from("course_curriculum").select("chapter_number, title").eq("course_id", id).order("chapter_number"),
    db.from("course_reviews").select("id, user_id, satisfaction, cleanliness, kindness, content, created_at").eq("course_id", id).order("created_at", { ascending: false }),
    supabase.from("artists").select("profile_image_path, instagram_url, introduce, kakao_url, contact").eq("user_id", artistId).is("deleted_at", null).maybeSingle(),
  ]);

  const reviews = (revRes.data ?? []) as ReviewRow[];
  const reviewerMap = await buildReviewerMap(supabase, reviews);
  const reviewList = mapReviews(reviews, reviewerMap);

  return {
    artistName: profileRes.data?.nickname ?? "아티스트",
    artistDetail: artistRes.data,
    images: (imgRes.data ?? []) as ImageRow[],
    highlights: (hlRes.data ?? []) as HighlightRow[],
    curriculum: (curRes.data ?? []) as CurriculumRow[],
    reviewList,
    summary: computeSummary(reviewList),
  };
}

function nullStr(v: string | null | undefined): string | null {
  return v ?? null;
}

function buildCourseDetail(course: CourseRow, rel: Awaited<ReturnType<typeof fetchCourseRelations>>): CourseDetail {
  const d = rel.artistDetail;
  return {
    id: course.id, artistId: course.artist_id, title: course.title, description: course.description,
    location: course.location, duration: course.duration, classType: course.class_type,
    category: course.category, price: course.price, originalPrice: course.original_price, discountRate: course.discount_rate,
    artistName: rel.artistName,
    artistProfileImage: nullStr(d?.profile_image_path),
    artistInstagram: nullStr(d?.instagram_url),
    artistIntroduce: nullStr(d?.introduce),
    artistKakaoUrl: nullStr(d?.kakao_url),
    artistContact: nullStr(d?.contact),
    images: rel.images.map((img) => ({ imageUrl: img.image_url, orderIndex: img.order_index })),
    highlights: rel.highlights.map((h) => ({ orderIndex: h.order_index, title: h.title, description: h.description, imageUrl: h.image_url })),
    curriculum: rel.curriculum.map((c) => ({ chapterNumber: c.chapter_number, title: c.title })),
    reviews: rel.reviewList, reviewSummary: rel.summary,
  };
}

export async function fetchCourseById(id: string): Promise<CourseDetail | null> {
  const supabase = await createClient();
  const db = supabase as AnyClient;
  const course = await fetchCourseRow(db, id);
  if (!course) return null;
  const rel = await fetchCourseRelations(supabase, db, id, course.artist_id);
  return buildCourseDetail(course, rel);
}

export async function fetchCourseList(): Promise<CourseListItem[]> {
  const supabase = await createClient();
  const db = supabase as AnyClient;

  const { data: courses } = await db
    .from("courses")
    .select("id, artist_id, title, location, duration, class_type, category, price, original_price, discount_rate")
    .eq("is_active", true)
    .order("created_at", { ascending: false }) as { data: CourseRow[] | null };

  if (!courses || courses.length === 0) return [];

  const result: CourseListItem[] = [];

  for (const c of courses) {
    const [profileRes, imgRes, revRes] = await Promise.all([
      supabase.from("profiles").select("nickname").eq("id", c.artist_id).maybeSingle(),
      db.from("course_images").select("image_url").eq("course_id", c.id).order("order_index").limit(1).maybeSingle(),
      db.from("course_reviews").select("satisfaction").eq("course_id", c.id),
    ]);

    const img = imgRes.data as { image_url: string } | null;
    const revs = (revRes.data ?? []) as Array<{ satisfaction: number }>;
    const avg = revs.length > 0
      ? revs.reduce((s, r) => s + Number(r.satisfaction), 0) / revs.length : 0;

    result.push({
      id: c.id, title: c.title, location: c.location,
      duration: c.duration, classType: c.class_type, category: c.category,
      price: c.price, originalPrice: c.original_price, discountRate: c.discount_rate,
      artistName: profileRes.data?.nickname ?? "아티스트",
      imageUrl: img?.image_url ?? null,
      reviewCount: revs.length,
      avgRating: Math.round(avg * 10) / 10,
    });
  }

  return result;
}

async function buildReviewerMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reviews: ReviewRow[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = reviews.map((r) => r.user_id);
  if (ids.length === 0) return map;

  const { data } = await supabase.from("profiles").select("id, nickname").in("id", ids);
  for (const r of data ?? []) {
    map.set(r.id, r.nickname ?? "익명");
  }
  return map;
}

function mapReviews(reviews: ReviewRow[], nameMap: Map<string, string>): CourseReview[] {
  return reviews.map((r) => ({
    id: r.id,
    userName: nameMap.get(r.user_id) ?? "익명",
    satisfaction: Number(r.satisfaction),
    cleanliness: Number(r.cleanliness),
    kindness: Number(r.kindness),
    content: r.content,
    createdAt: r.created_at,
  }));
}

function computeSummary(reviews: CourseReview[]): ReviewSummary {
  const n = reviews.length;
  if (n === 0) return { count: 0, avgSatisfaction: 0, avgCleanliness: 0, avgKindness: 0 };

  const sum = (fn: (r: CourseReview) => number): number => reviews.reduce((s, r) => s + fn(r), 0) / n;
  return {
    count: n,
    avgSatisfaction: Math.round(sum((r) => r.satisfaction) * 10) / 10,
    avgCleanliness: Math.round(sum((r) => r.cleanliness) * 10) / 10,
    avgKindness: Math.round(sum((r) => r.kindness) * 10) / 10,
  };
}
