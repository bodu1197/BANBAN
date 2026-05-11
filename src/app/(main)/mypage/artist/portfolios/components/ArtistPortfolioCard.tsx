import Link from "next/link";
import Image from "next/image";
import { Pause } from "lucide-react";
import PriceCard from "@/components/shared/PriceCard";
import type { HomePortfolio } from "@/lib/supabase/portfolio-common";
import { STRINGS } from "@/lib/strings";
interface ArtistPortfolioCardProps {
    portfolio: HomePortfolio;
    onDelete: (portfolio: HomePortfolio) => void;
    }

function isExpiredSale(saleEndedAt: string | null): boolean {
    return saleEndedAt !== null && new Date(saleEndedAt).getTime() < Date.now();
}

function PortfolioThumbnail({ src, alt }: Readonly<{ src: string; alt: string }>): React.ReactElement {
    return (
        <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted">
            <Image alt={alt} src={src} width={96} height={96} className="w-full h-full object-cover" unoptimized />
        </div>
    );
}

function ExpiredBadge(): React.ReactElement {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">
            <Pause className="h-3 w-3" aria-hidden="true" />
            대기 (할인 만료)
        </span>
    );
}

export default function ArtistPortfolioCard({
    portfolio, onDelete }: Readonly<ArtistPortfolioCardProps>): React.ReactElement {
    const imgSrc = portfolio.imageUrl || "/images/default_portfolio_image.png";
    const imgAlt = portfolio.title || "Portfolio Image";
    const expired = isExpiredSale(portfolio.saleEndedAt);

    return (
        <li className={`border rounded-lg overflow-hidden mb-3 ${expired ? "border-amber-400/50 bg-amber-50/30" : "border-border bg-card"}`}>
            <Link href={`/portfolios/${portfolio.id}`} className="flex gap-4 p-3">
                <div className="relative">
                    <PortfolioThumbnail src={imgSrc} alt={imgAlt} />
                    {expired ? <div className="absolute inset-0 bg-black/30 rounded-md" /> : null}
                </div>
                <div className="flex flex-col justify-center min-w-0">
                    {expired ? <ExpiredBadge /> : null}
                    <p className={`font-medium truncate ${expired ? "text-muted-foreground" : ""}`}>{portfolio.title}</p>
                    <div className="mt-1"><PriceCard portfolio={portfolio} /></div>
                </div>
            </Link>
            <div className="flex gap-2 px-3 pb-3">
                <Link
                    href={`/mypage/artist/portfolios/edit/${portfolio.id}`}
                    className="flex-1 text-center py-2 text-sm rounded-md bg-brand-primary text-white font-medium hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                    {STRINGS.common.edit}
                </Link>
                <button
                    type="button"
                    onClick={(): void => { onDelete(portfolio); }}
                    className="flex-1 text-center py-2 text-sm rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                    {STRINGS.common.delete}
                </button>
            </div>
        </li>
    );
}
