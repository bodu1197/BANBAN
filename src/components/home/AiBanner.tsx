import Link from "next/link";
import { Sparkles, ArrowRight, Search, Camera } from "lucide-react";

interface AiBannerLabels {
    aiBannerHeadline: string;
    aiBannerDesc: string;
    aiBannerPhoto: string;
    aiBannerText: string;
}

interface AiBannerProps {
    labels: AiBannerLabels;
    compact?: boolean;
}

function FeaturePill({ icon, label }: Readonly<{ icon: React.ReactNode; label: string }>): React.ReactElement {
    return (
        <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 backdrop-blur-sm">
            {icon}
            <span className="text-[10px] font-medium text-white/80">{label}</span>
        </div>
    );
}

/** Floating tattoo-inspired SVG motifs */
function AnimatedBackground(): React.ReactElement {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Glowing orbs - Optimized with opacity fade instead of blur animation */}
            <div className="animate-ai-fade absolute right-0 top-2 h-24 w-24 rounded-full bg-purple-500/30 blur-3xl" />
            <div className="animate-ai-fade absolute left-0 bottom-0 h-20 w-20 rounded-full bg-indigo-400/25 [animation-delay:2s] blur-3xl" />
            <div className="animate-ai-fade absolute right-1/4 top-1/3 h-14 w-14 rounded-full bg-pink-500/20 [animation-delay:3.5s] blur-3xl" />


            {/* Tattoo needle / line art — drifts up-right */}
            <svg className="animate-ai-float-1 absolute bottom-4 left-6 h-16 w-16 text-white/15" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <path d="M12 52 L32 12 L36 14 L18 54 Z" fill="currentColor" />
                <circle cx="34" cy="10" r="3" fill="currentColor" opacity="0.6" />
                <path d="M20 48 C28 44, 36 48, 44 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>


            {/* AI circuit / neural node cluster — drifts left */}
            <svg className="animate-ai-float-2 absolute right-4 top-3 h-20 w-20 text-white/10" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                <circle cx="40" cy="20" r="3" fill="currentColor" opacity="0.8" />
                <circle cx="20" cy="50" r="2.5" fill="currentColor" opacity="0.6" />
                <circle cx="60" cy="50" r="2.5" fill="currentColor" opacity="0.6" />
                <circle cx="40" cy="65" r="2" fill="currentColor" opacity="0.4" />
                <line x1="40" y1="20" x2="20" y2="50" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                <line x1="40" y1="20" x2="60" y2="50" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                <line x1="20" y1="50" x2="60" y2="50" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
                <line x1="20" y1="50" x2="40" y2="65" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
                <line x1="60" y1="50" x2="40" y2="65" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
                <circle cx="40" cy="20" r="8" stroke="currentColor" strokeWidth="0.5" className="animate-ai-pulse-ring" />
            </svg>

            {/* Mandala / tattoo pattern — slow drift */}
            <svg className="animate-ai-float-3 absolute left-1/3 top-1 h-14 w-14 text-white/8" viewBox="0 0 56 56" fill="none" aria-hidden="true">
                <circle cx="28" cy="28" r="12" stroke="currentColor" strokeWidth="0.8" />
                <circle cx="28" cy="28" r="20" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 3" />
                <path d="M28 8 L28 48 M8 28 L48 28 M14 14 L42 42 M42 14 L14 42" stroke="currentColor" strokeWidth="0.4" opacity="0.5" />
            </svg>

            {/* Ink splatter dots — scattered */}
            <svg className="animate-ai-float-2 absolute bottom-2 right-1/4 h-10 w-10 text-white/10 [animation-delay:1.5s]" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <circle cx="10" cy="15" r="4" fill="currentColor" opacity="0.4" />
                <circle cx="25" cy="8" r="2.5" fill="currentColor" opacity="0.3" />
                <circle cx="30" cy="25" r="5" fill="currentColor" opacity="0.25" />
                <circle cx="15" cy="30" r="1.5" fill="currentColor" opacity="0.35" />
            </svg>
        </div>
    );
}

export function AiBanner({ labels, compact }: Readonly<AiBannerProps>): React.ReactElement {
    if (compact) {
        return (
            <Link
                href="/beauty-sim"
                className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900 p-4 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-purple-500/30 blur-3xl" />
                <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-md">
                        <Sparkles className="h-5 w-5 text-yellow-300" aria-hidden="true" />
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                        AI MATCHING
                    </div>
                    <h3 className="text-sm font-bold leading-tight text-white">{labels.aiBannerHeadline}</h3>
                    <p className="text-[10px] leading-tight text-white/60">{labels.aiBannerDesc}</p>
                </div>
            </Link>
        );
    }

    return (
        <div className="px-4 py-4">
            <Link
                href="/beauty-sim"
                className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <AnimatedBackground />

                <div className="relative z-10 flex h-[153px] flex-col items-center justify-center gap-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 backdrop-blur-md">
                        <Sparkles className="h-3 w-3 text-yellow-300" />
                        <span className="text-[10px] font-semibold tracking-wider text-white/90">AI MATCHING</span>
                    </div>

                    <h2 className="text-lg font-extrabold leading-tight text-white">{labels.aiBannerHeadline}</h2>
                    <p className="text-xs text-white/60">{labels.aiBannerDesc}</p>

                    <div className="flex items-center gap-2">
                        <FeaturePill icon={<Camera className="h-3 w-3 text-purple-300" />} label={labels.aiBannerPhoto} />
                        <FeaturePill icon={<Search className="h-3 w-3 text-blue-300" />} label={labels.aiBannerText} />
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 transition-all group-hover:bg-white/30 group-focus-visible:bg-white/30">
                            <ArrowRight className="h-3.5 w-3.5 text-white" />
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
