import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";

interface QuoteRequestBannerProps {
    title: string;
    desc: string;
    badge: string;
}

export function QuoteRequestBanner({ title, desc, badge }: Readonly<QuoteRequestBannerProps>): React.ReactElement {
    return (
        <Link
            href="/quote-request/create"
            className="relative block overflow-hidden rounded-2xl bg-gradient-to-r from-amber-900/80 via-orange-900/80 to-red-900/80 p-4 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-orange-500/15 blur-3xl" />

            <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                    <FileText className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-sm">
                        {badge}
                    </div>
                    <h3 className="text-base font-bold text-white">{title}</h3>
                    <p className="text-xs text-white/60">{desc}</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <ArrowRight className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
            </div>
        </Link>
    );
}
