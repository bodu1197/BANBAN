import type { HomePortfolio } from "@/lib/supabase/portfolio-common";

interface PriceCardProps {
    portfolio: HomePortfolio;
}

function formatPrice(price: number | undefined | null): string {
    if (!price) return "0원";
    return `${Number(price).toLocaleString()}원`;
}

export default function PriceCard({ portfolio }: Readonly<PriceCardProps>): React.ReactElement {
    const hasDiscount = portfolio.discountRate > 0;

    return (
        <>
            {hasDiscount && (
                <s className="text-muted-foreground text-sm line-through">
                    {formatPrice(portfolio.priceOrigin)}
                </s>
            )}
            <p>
                {hasDiscount && <strong className="text-red-500">{portfolio.discountRate}%</strong>}
                {" "}
                <b>{formatPrice(portfolio.price)}</b>
            </p>
        </>
    );
}
