import type { HomePortfolio } from "@/lib/supabase/home-queries";
import { PortfolioGridCard } from "./PortfolioGridCard";
import { EmptyState } from "./EmptyState";

interface PortfolioGridProps {
  portfolios: HomePortfolio[];
  emptyMessage: string;
  showDiscount?: boolean;
}

export function PortfolioGrid({
  portfolios,
  emptyMessage,
  showDiscount = false,
}: Readonly<PortfolioGridProps>): React.ReactElement {
  if (portfolios.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {portfolios.map((p) => (
        <PortfolioGridCard key={p.id} portfolio={p} showDiscount={showDiscount} />
      ))}
    </div>
  );
}
