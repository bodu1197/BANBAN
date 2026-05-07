import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ExhibitionItem } from "@/lib/supabase/exhibition-queries";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

function toImageUrl(path: string): string {
    if (path.startsWith("http")) return path;
    return `${SUPABASE_URL}/storage/v1/object/public/portfolios/${path}`;
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
    WOMENS_BEAUTY: { ko: "여자뷰티" },
    MENS_BEAUTY: { ko: "남자뷰티" },
    SEMI_PERMANENT: { ko: "반영구" },
};

const CATEGORY_COLORS: Record<string, string> = {
    SEMI_PERMANENT: "bg-purple-500/80",
    WOMENS_BEAUTY: "bg-pink-500/80",
    MENS_BEAUTY: "bg-blue-500/80",
};

function getCategoryLabel(category: string): string {
    // eslint-disable-next-line security/detect-object-injection -- Safe: known constant keys
    return CATEGORY_LABELS[category]?.ko ?? category;
}

function getCategoryColor(category: string): string {
    // eslint-disable-next-line security/detect-object-injection -- Safe: known constant keys
    return CATEGORY_COLORS[category] ?? "bg-zinc-500/80";
}

export function ExhibitionCard({ item}: Readonly<{ item: ExhibitionItem; }>): React.ReactElement {
    const href = `/exhibition/${item.id}`;
    return (
        <Link
            href={href}
            className="group relative block overflow-hidden rounded-2xl shadow-xl transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="pointer-events-none absolute inset-0">
                <Image
                    src={toImageUrl(item.image_path)}
                    alt={item.title}
                    fill
                    sizes="(max-width: 767px) 100vw, 767px"
                    className="object-cover"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            </div>
            <div className="relative z-10 flex h-[200px] items-center gap-5 px-6 lg:h-[250px] lg:px-10">
                <div className="min-w-0 flex-1">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm ${getCategoryColor(item.category)}`}>
                        {getCategoryLabel(item.category)}
                    </span>
                    <h2 className="mt-1.5 text-lg font-extrabold leading-tight text-white drop-shadow-lg lg:text-xl">{item.title}</h2>
                    {item.subtitle ? (
                        <p className="mt-1 text-xs text-white/80 drop-shadow lg:text-sm">{item.subtitle}</p>
                    ) : null}
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 transition-all group-hover:bg-white/30 group-focus-visible:bg-white/30">
                    <ArrowRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" aria-hidden="true" />
                </div>
            </div>
        </Link>
    );
}
