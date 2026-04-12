import Image from "next/image";
import Link from "next/link";
import { Ticket, ArrowRight } from "lucide-react";

export interface HeroBannerData {
    id: string;
    title: string;
    subtitle: string | null;
    image_path: string;
    link_url: string | null;
}

function FallbackBanner(): React.ReactElement {
    return (
        <div className="px-4 pt-3 pb-1">
            <Link
                href="/exhibition"
                className="group relative block overflow-hidden rounded-2xl shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-900 via-orange-900 to-red-900" />
                    <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-yellow-500/20 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-orange-500/15 blur-3xl" />
                </div>
                <div className="relative z-10 flex h-[160px] items-center gap-5 px-4 lg:h-[200px] lg:px-10">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg lg:h-16 lg:w-16">
                        <Ticket className="h-7 w-7 text-white lg:h-8 lg:w-8" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-yellow-200 backdrop-blur-sm">SPECIAL EVENT</span>
                        <h2 className="mt-1.5 text-lg font-extrabold leading-tight text-white lg:text-xl">특별 기획전 모아보기</h2>
                        <p className="mt-1 text-xs text-white/60 lg:text-sm">할인 이벤트부터 인기 아티스트 콜라보까지</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 transition-all group-hover:bg-white/30 group-focus-visible:bg-white/30">
                        <ArrowRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" aria-hidden="true" />
                    </div>
                </div>
            </Link>
        </div>
    );
}

export function ExhibitionBanner({ banner }: Readonly<{ banner?: HeroBannerData | null }>): React.ReactElement {
    if (!banner) return <FallbackBanner />;

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const imageUrl = banner.image_path.startsWith("http")
        ? banner.image_path
        : `${SUPABASE_URL}/storage/v1/object/public/portfolios/${banner.image_path}`;

    const href = banner.link_url ?? "/exhibition";

    return (
        <div className="px-4 pt-3 pb-1">
            <Link
                href={href}
                className="group relative block overflow-hidden rounded-2xl shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <div className="pointer-events-none absolute inset-0">
                    <Image
                        src={imageUrl}
                        alt={banner.title}
                        fill
                        sizes="(max-width: 767px) 100vw, 767px"
                        className="object-cover"
                        quality={65}
                        priority
                        fetchPriority="high"
                    />

                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                </div>
                <div className="relative z-10 flex h-[160px] items-center gap-5 px-4 lg:h-[200px] lg:px-10">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-extrabold leading-tight text-white drop-shadow-lg lg:text-xl">{banner.title}</h2>
                        {banner.subtitle ? (
                            <p className="mt-1 text-xs text-white/80 drop-shadow lg:text-sm">{banner.subtitle}</p>
                        ) : null}
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 transition-all group-hover:bg-white/30 group-focus-visible:bg-white/30">
                        <ArrowRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" aria-hidden="true" />
                    </div>
                </div>
            </Link>
        </div>
    );
}
