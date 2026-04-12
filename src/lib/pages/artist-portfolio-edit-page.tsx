import PortfolioEditClient from "@/app/(main)/mypage/artist/portfolios/edit/[id]/components/PortfolioEditClient";

export async function renderArtistPortfolioEditPage(portfolioId: string): Promise<React.ReactElement> {
    return <PortfolioEditClient portfolioId={portfolioId} />;
}
