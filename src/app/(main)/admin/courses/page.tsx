// @client-reason: Admin course management with search, pagination, toggle, delete
"use client";

import { useState, useCallback, useEffect } from "react";
import { Trash2, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  AdminSearchBar,
  AdminPagination,
  AdminSearchResetBadge,
  AdminLoadingSpinner,
  AdminErrorState,
  AdminPageHeader,
} from "@/components/admin/admin-shared";

// ─── Types ──────────────────────────────────────────────

interface CourseItem {
  id: string;
  title: string;
  category: string;
  classType: string;
  price: number;
  isActive: boolean;
  artistName: string;
  createdAt: string;
}

interface CoursesResponse {
  courses: CourseItem[];
  total: number;
  page: number;
  limit: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  COMPREHENSIVE: "종합",
  MACHINE: "머신",
  DRAWING: "드로잉",
  OTHER: "기타",
};

const CLASS_TYPE_LABELS: Record<string, string> = {
  OFFLINE: "오프라인",
  ONLINE: "온라인",
  HYBRID: "온/오프라인",
};

// ─── Data Hook ──────────────────────────────────────────

function useCourseList(): {
  data: CoursesResponse | null; loading: boolean; error: string | null;
  search: string; page: number;
  setSearch: (s: string) => void; setPage: (p: number) => void; refetch: () => void;
} {
  const [data, setData] = useState<CoursesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/courses?${params.toString()}`);
    if (res.status === 403) { setError("접근 권한이 없습니다."); setLoading(false); return; }
    if (!res.ok) { setError("데이터를 불러올 수 없습니다."); setLoading(false); return; }
    setData(await res.json() as CoursesResponse);
    setError(null);
    setLoading(false);
  }, [search, page]);

  const setSearch = (s: string): void => { setSearchState(s); setPage(1); };

  return { data, loading, error, search, page, setSearch, setPage, refetch: fetchData };
}

// ─── Actions ────────────────────────────────────────────

async function toggleActive(id: string, isActive: boolean): Promise<boolean> {
  const res = await fetch("/api/admin/courses", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, is_active: !isActive }),
  });
  return res.ok;
}

async function deleteCourse(id: string): Promise<boolean> {
  const res = await fetch("/api/admin/courses", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}

// ─── Table Row ──────────────────────────────────────────

function CourseRow({ course, onToggle, onDelete }: Readonly<{
  course: CourseItem; onToggle: () => void; onDelete: () => void;
}>): React.ReactElement {
  const date = new Date(course.createdAt).toLocaleDateString("ko-KR");
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 focus-visible:bg-white/5">
      <td className="px-3 py-3 text-sm text-white">{course.title}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{course.artistName}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{CATEGORY_LABELS[course.category] ?? course.category}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{CLASS_TYPE_LABELS[course.classType] ?? course.classType}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{course.price.toLocaleString()}원</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{date}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={onToggle} aria-label={course.isActive ? "비활성화" : "활성화"}
            className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${course.isActive ? "text-green-400 hover:bg-green-500/10 focus-visible:bg-green-500/10" : "text-zinc-500 hover:bg-white/10 focus-visible:bg-white/10"}`}>
            {course.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onDelete} aria-label="삭제"
            className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-red-500/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Table ──────────────────────────────────────────────

function CourseTable({ courses, onRefetch }: Readonly<{
  courses: CourseItem[]; onRefetch: () => void;
}>): React.ReactElement {
  const handleToggle = async (c: CourseItem): Promise<void> => {
    const ok = await toggleActive(c.id, c.isActive);
    if (ok) onRefetch();
  };
  const handleDelete = async (c: CourseItem): Promise<void> => {
    if (!globalThis.confirm(`"${c.title}" 수강을 삭제하시겠습니까?`)) return;
    const ok = await deleteCourse(c.id);
    if (ok) onRefetch();
  };
  if (courses.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-500">등록된 수강이 없습니다.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left">
        <thead className="border-b border-white/10 bg-white/5">
          <tr>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">제목</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">아티스트</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">카테고리</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">형태</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">가격</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">등록일</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">관리</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <CourseRow key={c.id} course={c} onToggle={() => void handleToggle(c)} onDelete={() => void handleDelete(c)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page Content ───────────────────────────────────────

function PageContent({ data, search, page, setSearch, setPage, refetch }: Readonly<{
  data: CoursesResponse; search: string; page: number;
  setSearch: (s: string) => void; setPage: (p: number) => void; refetch: () => void;
}>): React.ReactElement {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <AdminPageHeader title="수강 관리" count={data.total} />
      <AdminSearchBar onSearch={setSearch} placeholder="수강 제목 검색..." accentColor="purple" />
      <AdminSearchResetBadge search={search} onReset={() => setSearch("")} accentColor="purple" />
      <CourseTable courses={data.courses} onRefetch={refetch} />
      <AdminPagination currentPage={page} total={data.total} limit={data.limit} onPageChange={setPage} />
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────

export default function AdminCoursesPage(): React.ReactElement {
  const { user, isLoading: authLoading } = useAuth();
  const { data, loading, error, search, page, setSearch, setPage, refetch } = useCourseList();

  useEffect(() => {
    if (!authLoading && user) refetch();
  }, [authLoading, user, refetch]);

  if (authLoading || loading) return <AdminLoadingSpinner accentColor="purple" />;
  if (error) return <AdminErrorState message={error} />;
  if (!data) return <AdminLoadingSpinner accentColor="purple" />;

  return <PageContent data={data} search={search} page={page} setSearch={setSearch} setPage={setPage} refetch={refetch} />;
}
