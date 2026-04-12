// @client-reason: Admin member management with search, pagination, and inline editing
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Save, Shield, ShieldOff, Trash2, ArrowUpDown, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminSearchBar, AdminPagination, AdminSearchResetBadge, AdminLoadingSpinner, AdminErrorState, AdminPageHeader } from "@/components/admin/admin-shared";

// ─── Types ───────────────────────────────────────────────

type MemberTab = "all" | "general" | "semi_permanent" | "admin";
type SortKey = "" | "last_login_at_asc" | "last_login_at_desc";

interface Member {
    id: string;
    username: string;
    email: string | null;
    nickname: string;
    contact: string | null;
    is_admin: boolean;
    type_social: string;
    type_artist: string | null;
    artist_id: string | null;
    language: string;
    last_login_at: string | null;
    created_at: string;
}

interface LoginStats {
    artist_login_count: number;
    general_login_count: number;
    total_count: number;
}

interface MembersResponse {
    members: Member[];
    total: number;
    page: number;
    limit: number;
    loginStats?: LoginStats;
}

interface MemberForm {
    nickname: string;
    email: string;
    contact: string;
    is_admin: boolean;
    language: string;
    newPassword: string;
}

const SOCIAL_LABELS: Record<string, string> = {
    NONE: "일반", KAKAO: "카카오", GOOGLE: "구글", APPLE: "애플",
};

const ARTIST_TYPE_LABELS: Record<string, string> = {
    SEMI_PERMANENT: "반영구",
};

const TAB_LIST: { key: MemberTab; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "general", label: "일반회원" },
    { key: "semi_permanent", label: "반영구" },
    { key: "admin", label: "관리자" },
];

// ─── Hooks ──────────────────────────────────────────────

function useMemberList(authLoading: boolean, user: unknown): {
    data: MembersResponse | null; loading: boolean; error: string | null;
    search: string; tab: MemberTab; sort: SortKey;
    setSearch: (s: string) => void; setTab: (t: MemberTab) => void;
    setPage: (p: number) => void; setSort: (s: SortKey) => void; refetch: () => void;
} {
    const [data, setData] = useState<MembersResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<MemberTab>("all");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<SortKey>("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), tab });
            if (search) params.set("search", search);
            if (sort) params.set("sort", sort);
            const res = await fetch(`/api/admin/members?${params.toString()}`);
            if (res.status === 403) { setError("관리자 권한이 필요합니다."); return; }
            if (!res.ok) { setError("데이터를 불러올 수 없습니다."); return; }
            setData(await res.json() as MembersResponse);
            setError(null);
        } catch {
            setError("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }, [search, tab, page, sort]);

    useEffect(() => {
        if (!authLoading && user) fetchData();
        if (!authLoading && !user) { setError("로그인이 필요합니다."); setLoading(false); }
    }, [authLoading, user, fetchData]);

    return { data, loading, error, search, tab, sort, setSearch, setTab, setPage, setSort, refetch: fetchData };
}

// ─── Login Stats Banner ─────────────────────────────────

function LoginStatsBanner({ stats }: Readonly<{ stats: LoginStats }>): React.ReactElement {
    return (
        <div className="flex flex-wrap gap-3">
            <StatCard label="오늘 아티스트 접속" value={stats.artist_login_count} color="pink" />
            <StatCard label="오늘 일반회원 접속" value={stats.general_login_count} color="blue" />
            <StatCard label="오늘 전체 접속" value={stats.total_count} color="zinc" />
        </div>
    );
}

function getStatColor(color: string): string {
    if (color === "pink") return "bg-pink-500/10 text-pink-400";
    if (color === "blue") return "bg-blue-500/10 text-blue-400";
    return "bg-white/5 text-zinc-300";
}

function StatCard({ label, value, color }: Readonly<{
    label: string; value: number; color: string;
}>): React.ReactElement {
    return (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 ${getStatColor(color)}`}>
            <Users className="h-4 w-4" />
            <span className="text-xs">{label}</span>
            <span className="text-sm font-bold">{value.toLocaleString()}명</span>
        </div>
    );
}

// ─── Sortable Header ────────────────────────────────────

function SortableHeader({ label, active, onToggle }: Readonly<{
    label: string; active: boolean; onToggle: () => void;
}>): React.ReactElement {
    return (
        <th className="px-4 py-3 font-medium">
            <button type="button" onClick={onToggle}
                className={`flex items-center gap-1 text-xs transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white ${active ? "text-pink-400" : "text-zinc-400"}`}>
                {label} <ArrowUpDown className="h-3 w-3" />
            </button>
        </th>
    );
}

// ─── MemberEditFormFields ───────────────────────────────

const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-pink-500 focus:outline-none";

function MemberEditFormFields({ form, setForm }: Readonly<{
    form: MemberForm;
    setForm: (f: MemberForm) => void;
}>): React.ReactElement {
    return (
        <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <label className="block">
                    <span className="mb-1 block text-[11px] text-zinc-400">닉네임</span>
                    <input type="text" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className={inputClass} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-[11px] text-zinc-400">이메일</span>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-[11px] text-zinc-400">연락처</span>
                    <input type="text" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={inputClass} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-[11px] text-zinc-400">언어</span>
                    <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputClass}>
                        <option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option>
                    </select>
                </label>
            </div>
            <MemberEditExtras form={form} setForm={setForm} />
        </>
    );
}

function MemberEditExtras({ form, setForm }: Readonly<{ form: MemberForm; setForm: (f: MemberForm) => void }>): React.ReactElement {
    return (
        <div className="mt-3 flex items-center gap-3">
            <button
                type="button"
                aria-pressed={form.is_admin}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    form.is_admin ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 focus-visible:bg-amber-500/30" : "bg-white/10 text-zinc-400 hover:bg-white/20 focus-visible:bg-white/20"
                }`}
                onClick={() => setForm({ ...form, is_admin: !form.is_admin })}
            >
                {form.is_admin ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                {form.is_admin ? "관리자 ON" : "관리자 OFF"}
            </button>
            <label className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">새 비밀번호</span>
                <input
                    type="password"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    placeholder="변경 시 입력"
                    className="w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:border-pink-500 focus:outline-none"
                />
            </label>
        </div>
    );
}

// ─── MemberEditPanel ────────────────────────────────────

function MemberEditPanel({ member, onSaved, onDeleted, onCancel }: Readonly<{
    member: Member; onSaved: () => void; onDeleted: () => void; onCancel: () => void;
}>): React.ReactElement {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<MemberForm>({
        nickname: member.nickname, email: member.email ?? "", contact: member.contact ?? "",
        is_admin: member.is_admin, language: member.language, newPassword: "",
    });

    const handleSave = async (): Promise<void> => {
        setSaving(true);
        try {
            const { newPassword, ...rest } = form;
            const payload: Record<string, unknown> = { id: member.id, ...rest };
            if (newPassword) payload.password = newPassword;
            const res = await fetch("/api/admin/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (res.ok) {
                onCancel(); onSaved();
                if (newPassword) alert("비밀번호가 변경되었습니다.");
            } else {
                const err = await res.json() as { error?: string };
                alert(`저장 실패: ${err.error ?? "알 수 없는 오류"}`);
            }
        } finally { setSaving(false); }
    };

    const handleDelete = async (): Promise<void> => {
        if (!globalThis.confirm(`"${member.nickname}" 회원을 삭제하시겠습니까?`)) return;
        const res = await fetch("/api/admin/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id }) });
        if (res.ok) { onDeleted(); return; }
        const err = await res.json() as { error?: string };
        alert(`삭제 실패: ${err.error ?? "알 수 없는 오류"}`);
    };

    return (
        <tr>
            <td colSpan={8} className="border-b border-white/5 p-0">
                <div className="bg-pink-500/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">@{member.username} 수정</p>
                        <EditActionButtons saving={saving} onSave={() => void handleSave()} onDelete={() => void handleDelete()} onCancel={onCancel} />
                    </div>
                    <MemberEditFormFields form={form} setForm={setForm} />
                </div>
            </td>
        </tr>
    );
}

// ─── EditActionButtons ──────────────────────────────────

function EditActionButtons({ saving, onSave, onDelete, onCancel }: Readonly<{
    saving: boolean; onSave: () => void; onDelete: () => void; onCancel: () => void;
}>): React.ReactElement {
    return (
        <div className="flex gap-1.5">
            <button type="button" aria-label="삭제" className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-red-500/30" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20" onClick={onCancel}>취소</button>
            <button type="button" disabled={saving} className="flex items-center gap-1 rounded-lg bg-pink-500 px-3 py-1 text-xs font-medium text-white hover:bg-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-pink-600 disabled:opacity-50" onClick={onSave}>
                <Save className="h-3 w-3" /> {saving ? "저장중..." : "저장"}
            </button>
        </div>
    );
}

// ─── Helpers ────────────────────────────────────────────

function formatDate(v: string | null): string {
    if (!v) return "-";
    return new Date(v).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

// ─── MemberTableRow ─────────────────────────────────────

function MemberTableRow({ member, onSaved, onDeleted }: Readonly<{
    member: Member; onSaved: () => void; onDeleted: () => void;
}>): React.ReactElement {
    const [editing, setEditing] = useState(false);
    if (editing) return <MemberEditPanel member={member} onSaved={onSaved} onDeleted={onDeleted} onCancel={() => setEditing(false)} />;
    return (
        <tr className="border-b border-white/5 text-sm transition-colors hover:bg-white/[0.02] focus-visible:bg-white/[0.02]">
            <td className="px-4 py-3 font-medium text-white">
                {member.artist_id ? (
                    <Link href={`/artists/${member.artist_id}`} target="_blank" className="hover:text-pink-400 focus-visible:text-pink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded transition-colors">{member.nickname}</Link>
                ) : member.nickname}
            </td>
            <td className="px-4 py-3 text-zinc-400">@{member.username}</td>
            <td className="px-4 py-3 text-zinc-400">{member.email ?? "-"}</td>
            <td className="px-4 py-3 text-zinc-400">{member.contact ?? "-"}</td>
            <td className="px-4 py-3">
                <MemberBadges member={member} />
            </td>
            <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(member.last_login_at)}</td>
            <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(member.created_at)}</td>
            <td className="px-4 py-3">
                <button type="button" aria-label="회원 수정" className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white/20" onClick={() => setEditing(true)}>수정</button>
            </td>
        </tr>
    );
}

// ─── MemberBadges ───────────────────────────────────────

function MemberBadges({ member }: Readonly<{ member: Member }>): React.ReactElement {
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {member.is_admin && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">관리자</span>
            )}
            {member.type_artist ? (
                <span className="rounded-full bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-medium text-pink-400">
                    {ARTIST_TYPE_LABELS[member.type_artist] ?? member.type_artist}
                </span>
            ) : (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">일반</span>
            )}
            {member.type_social !== "NONE" && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {SOCIAL_LABELS[member.type_social] ?? member.type_social}
                </span>
            )}
        </div>
    );
}

function MemberTabs({ activeTab, onChange }: Readonly<{
    activeTab: MemberTab;
    onChange: (tab: MemberTab) => void;
}>): React.ReactElement {
    return (
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {TAB_LIST.map(({ key, label }) => (
                <button
                    key={key}
                    type="button"
                    aria-pressed={activeTab === key}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        activeTab === key
                            ? "bg-pink-500 text-white"
                            : "text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:bg-white/10"
                    }`}
                    onClick={() => onChange(key)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

// ─── MemberTable ────────────────────────────────────────

function MemberTableHead({ sort, onToggleSort }: Readonly<{
    sort: SortKey; onToggleSort: () => void;
}>): React.ReactElement {
    return (
        <thead>
            <tr className="border-b border-white/10 bg-white/5 text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium">닉네임</th>
                <th className="px-4 py-3 font-medium">아이디</th>
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">연락처</th>
                <th className="px-4 py-3 font-medium">구분</th>
                <SortableHeader label="최종 로그인" active={sort !== ""} onToggle={onToggleSort} />
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium">관리</th>
            </tr>
        </thead>
    );
}

function MemberTable({ members, sort, onSort, refetch }: Readonly<{
    members: Member[]; sort: SortKey; onSort: (s: SortKey) => void; refetch: () => void;
}>): React.ReactElement {
    const toggleSort = (): void => {
        const next: SortKey = sort === "last_login_at_desc" ? "last_login_at_asc" : "last_login_at_desc";
        onSort(next);
    };

    return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left">
                <MemberTableHead sort={sort} onToggleSort={toggleSort} />
                <tbody>
                    {members.map((m) => (
                        <MemberTableRow key={m.id} member={m} onSaved={refetch} onDeleted={refetch} />
                    ))}
                </tbody>
            </table>
            {members.length === 0 && <p className="py-12 text-center text-sm text-zinc-500">검색 결과가 없습니다.</p>}
        </div>
    );
}

// ─── PageContent ────────────────────────────────────────

function PageContent({ data, search, tab, sort, setSearch, setTab, setPage, setSort, refetch }: Readonly<{
    data: MembersResponse; search: string; tab: MemberTab; sort: SortKey;
    setSearch: (s: string) => void; setTab: (t: MemberTab) => void;
    setPage: (p: number) => void; setSort: (s: SortKey) => void; refetch: () => void;
}>): React.ReactElement {
    return (
        <div className="min-h-full p-6 pb-40">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <AdminPageHeader title="회원 관리" count={data.total} countLabel="명" />
                <div className="w-full lg:w-96">
                    <AdminSearchBar onSearch={(q) => { setSearch(q); setPage(1); }} placeholder="이름, 닉네임, 이메일, 활동명 검색..." />
                </div>
            </div>
            {data.loginStats && <LoginStatsBanner stats={data.loginStats} />}
            <div className="mb-4 mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <MemberTabs activeTab={tab} onChange={(t) => { setTab(t); setPage(1); }} />
                <AdminSearchResetBadge search={search} onReset={() => { setSearch(""); setPage(1); }} />
            </div>
            <MemberTable members={data.members} sort={sort} onSort={setSort} refetch={refetch} />
            <AdminPagination currentPage={data.page} total={data.total} limit={data.limit} onPageChange={setPage} />
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────

export default function AdminMembersPage(): React.ReactElement {
    const { user, isLoading: authLoading } = useAuth();
    const { data, loading, error, search, tab, sort, setSearch, setTab, setPage, setSort, refetch } = useMemberList(authLoading, user);

    if (authLoading || (loading && !data)) return <AdminLoadingSpinner />;
    if (error) return <AdminErrorState message={error} />;
    if (!data) return <AdminLoadingSpinner />;

    return <PageContent data={data} search={search} tab={tab} sort={sort} setSearch={setSearch} setTab={setTab} setPage={setPage} setSort={setSort} refetch={refetch} />;
}
