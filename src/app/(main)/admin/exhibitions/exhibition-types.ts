// ─── Types & Constants for Exhibition Admin ─────────────

export interface ExhibitionItem {
    id: string;
    title: string;
    subtitle: string | null;
    image_path: string;
    link_url: string | null;
    category: string;
    order_index: number;
    is_active: boolean;
    start_at: string | null;
    end_at: string | null;
    created_at: string;
    exhibition_entries?: Array<{ count: number }>;
    pending_count: number;
}

export interface ExhibitionFormData {
    title: string;
    subtitle: string;
    image_path: string;
    category: string;
    is_active: boolean;
    start_at: string;
    end_at: string;
}

export const EMPTY_FORM: ExhibitionFormData = {
    title: "", subtitle: "", image_path: "",
    category: "TATTOO", is_active: true, start_at: "", end_at: "",
};

export const API_PATH = "/api/admin/exhibitions";
export const JSON_HEADERS = { "Content-Type": "application/json" };

export const CATEGORIES = [
    { value: "TATTOO", label: "타투" },
    { value: "WOMENS_BEAUTY", label: "여자뷰티" },
    { value: "MENS_BEAUTY", label: "남자뷰티" },
    { value: "TATTOO_COURSE", label: "타투수강" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
    TATTOO: "bg-purple-500/20 text-purple-400",
    WOMENS_BEAUTY: "bg-pink-500/20 text-pink-400",
    MENS_BEAUTY: "bg-blue-500/20 text-blue-400",
    TATTOO_COURSE: "bg-amber-500/20 text-amber-400",
};

export function categoryLabel(value: string): string {
    return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function categoryColor(value: string): string {
    // eslint-disable-next-line security/detect-object-injection -- Safe: known constant keys
    return CATEGORY_COLORS[value] ?? "bg-zinc-500/20 text-zinc-400";
}

export async function apiFetch(method: string, body?: unknown): Promise<void> {
    await fetch(API_PATH, { method, headers: JSON_HEADERS, body: body ? JSON.stringify(body) : undefined });
}

export function itemToForm(b: ExhibitionItem): ExhibitionFormData {
    return {
        title: b.title, subtitle: b.subtitle ?? "", image_path: b.image_path,
        category: b.category, is_active: b.is_active,
        start_at: b.start_at ?? "", end_at: b.end_at ?? "",
    };
}

export function formToPayload(data: ExhibitionFormData): Record<string, unknown> {
    return { ...data, start_at: data.start_at || null, end_at: data.end_at || null };
}
