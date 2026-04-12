import Link from "next/link";
import { Users } from "lucide-react";

interface ModelRecruitBannerProps {
        title: string;
    desc: string;
    badge: string;
}

export function ModelRecruitBanner({ title, desc, badge }: Readonly<ModelRecruitBannerProps>): React.ReactElement {
    return (
        <Link
            href={`/${"ko"}/recruitment`}
            className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/80 via-teal-900/80 to-cyan-900/80 p-4 shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md">
                    <Users className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <div className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {badge}
                </div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
                <p className="text-[10px] leading-tight text-white/60">{desc}</p>
            </div>
        </Link>
    );
}
