import PortfolioListClient from "@/app/(main)/mypage/artist/portfolios/components/PortfolioListClient";

export async function renderArtistPortfoliosPage(): Promise<React.ReactElement> {
    return (
        <div className="mypage-inner">
            <PortfolioListClient />
        </div>
    );
}
