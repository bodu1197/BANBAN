import Link from "next/link";
import { Eye, ArrowRight } from "lucide-react";

export function BeautySimBanner({ compact }: Readonly<{ compact?: boolean }>): React.ReactElement {
    if (compact) {
        return (
            <Link
                href="/beauty-sim/my"
                prefetch={false}
                className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-rose-300 via-pink-300 to-orange-200 p-4 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/30 blur-3xl" />
                <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/30 shadow-md backdrop-blur-sm">
                        <Eye className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div className="inline-flex items-center rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white">
                        FREE
                    </div>
                    <h3 className="text-sm font-bold text-white">눈썹 시뮬레이션</h3>
                    <p className="text-[10px] leading-tight text-white/60">내 얼굴에 맞는 눈썹 찾기</p>
                </div>
            </Link>
        );
    }

    return (
        <div className="px-4 py-3">
            <Link
                href="/beauty-sim/my"
                prefetch={false}
                className="relative block overflow-hidden rounded-2xl bg-gradient-to-br from-rose-300 via-pink-300 to-orange-200 p-4 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/30 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-rose-200/30 blur-3xl" />

                <div className="relative z-10 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 shadow-md backdrop-blur-sm">
                        <Eye className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                            FREE
                        </div>
                        <h3 className="text-base font-bold text-white">눈썹 시뮬레이션</h3>
                        <p className="text-xs text-white/60">시술 전 미리보기 — 내 얼굴에 맞는 눈썹 찾기</p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                        <ArrowRight className="h-4 w-4 text-white" aria-hidden="true" />
                    </div>
                </div>
            </Link>
        </div>
    );
}
