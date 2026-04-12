/**
 * Eyebrow template definitions for beauty simulation.
 *
 * Each template uses a PNG image from Supabase Storage (originally from PreView).
 * Templates are categorized into hairstroke, combo (embo), and shadow.
 */

export type BrowCategory = "hairstroke" | "combo" | "shadow";

export interface EyebrowTemplate {
    id: string;
    label: string;
    imageUrl: string;
    category: BrowCategory;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE = "https://bhcascuuecgwlxujtpkx.supabase.co/storage/v1/object/public/eyebrow-templates";

// ─── 헤어스트록 (Hair Stroke / Microblading) ────────────────────────────────

const HAIRSTROKE: Readonly<EyebrowTemplate[]> = [
    { id: "hs-1", label: "헤어스트록1", imageUrl: `${STORAGE}/hairstroke1.png`, category: "hairstroke" },
    { id: "hs-2", label: "헤어스트록2", imageUrl: `${STORAGE}/hairstroke2.png`, category: "hairstroke" },
    { id: "hs-3", label: "헤어스트록3", imageUrl: `${STORAGE}/hairstroke3.png`, category: "hairstroke" },
    { id: "hs-4", label: "헤어스트록4", imageUrl: `${STORAGE}/hairstroke4.png`, category: "hairstroke" },
    { id: "hs-5", label: "헤어스트록5", imageUrl: `${STORAGE}/hairstroke5.png`, category: "hairstroke" },
    { id: "hs-6", label: "헤어스트록6", imageUrl: `${STORAGE}/hairstroke6.png`, category: "hairstroke" },
    { id: "hs-7", label: "헤어스트록7", imageUrl: `${STORAGE}/hairstroke7.png`, category: "hairstroke" },
    { id: "hs-8", label: "헤어스트록8", imageUrl: `${STORAGE}/hairstroke8.png`, category: "hairstroke" },
    { id: "hs-9", label: "헤어스트록9", imageUrl: `${STORAGE}/hairstroke9.png`, category: "hairstroke" },
    { id: "hs-10", label: "헤어스트록10", imageUrl: `${STORAGE}/hairstroke10.png`, category: "hairstroke" },
    { id: "hs-11", label: "헤어스트록11", imageUrl: `${STORAGE}/hairstroke11.png`, category: "hairstroke" },
];

// ─── 콤보 (Combo — grouped under hairstroke like PreView) ────────────────────

const COMBO: Readonly<EyebrowTemplate[]> = [
    { id: "cb-1", label: "콤보1", imageUrl: `${STORAGE}/combo1.png`, category: "hairstroke" },
    { id: "cb-2", label: "콤보2", imageUrl: `${STORAGE}/combo2.png`, category: "hairstroke" },
    { id: "cb-3", label: "콤보3", imageUrl: `${STORAGE}/combo3.png`, category: "hairstroke" },
];

// ─── 엠보 (Embo) ────────────────────────────────────────────────────────────

const EMBO: Readonly<EyebrowTemplate[]> = [
    { id: "em-1", label: "엠보1", imageUrl: `${STORAGE}/embo1.png`, category: "combo" },
    { id: "em-2", label: "엠보2", imageUrl: `${STORAGE}/embo2.png`, category: "combo" },
    { id: "em-3", label: "엠보3", imageUrl: `${STORAGE}/embo3.png`, category: "combo" },
];

// ─── 쉐도우 (Shadow / Powder) ───────────────────────────────────────────────

const SHADOW: Readonly<EyebrowTemplate[]> = [
    { id: "sh-2", label: "쉐도우2", imageUrl: `${STORAGE}/shadow1.png`, category: "shadow" },
    { id: "sh-3", label: "쉐도우3", imageUrl: `${STORAGE}/shadow2.png`, category: "shadow" },
    { id: "sh-4", label: "쉐도우4", imageUrl: `${STORAGE}/shadow3.png`, category: "shadow" },
];

// ─── All Templates ──────────────────────────────────────────────────────────

export const ALL_TEMPLATES: Readonly<EyebrowTemplate[]> = [
    ...HAIRSTROKE,
    ...COMBO,
    ...EMBO,
    ...SHADOW,
];

export const CATEGORIES: ReadonlyArray<{ value: BrowCategory; label: string }> = [
    { value: "hairstroke", label: "헤어스트록" },
    { value: "combo", label: "엠보" },
    { value: "shadow", label: "쉐도우" },
];

export function getTemplatesByCategory(category: BrowCategory): EyebrowTemplate[] {
    return ALL_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): EyebrowTemplate | undefined {
    return ALL_TEMPLATES.find((t) => t.id === id);
}
