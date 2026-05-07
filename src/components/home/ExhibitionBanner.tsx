import Link from "next/link";
import { Ticket, ArrowRight } from "lucide-react";

export function ExhibitionBanner(): React.ReactElement {
    return (
        <div className="px-4 pt-3 pb-1">
            <Link
                href="/exhibition"
                className="group relative block overflow-hidden rounded-2xl shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500" />
                    <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/25 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-rose-300/30 blur-3xl" />
                </div>
                <div className="relative z-10 flex h-[120px] items-center gap-5 px-4 lg:h-[140px] lg:px-10">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 shadow-lg backdrop-blur-sm lg:h-14 lg:w-14">
                        <Ticket className="h-6 w-6 text-white lg:h-7 lg:w-7" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white backdrop-blur-sm">SPECIAL EVENT</span>
                        <h2 className="mt-1.5 text-base font-extrabold leading-tight text-white lg:text-lg">특별 기획전 모아보기</h2>
                        <p className="mt-1 text-xs text-white/70 lg:text-sm">할인 이벤트부터 인기 아티스트 콜라보까지</p>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25 transition-all group-hover:bg-white/40 group-focus-visible:bg-white/40">
                        <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" aria-hidden="true" />
                    </div>
                </div>
            </Link>
        </div>
    );
}
