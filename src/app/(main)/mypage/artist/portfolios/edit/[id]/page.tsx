import { renderArtistPortfolioEditPage } from "@/lib/pages/artist-portfolio-edit-page";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
    const { id } = await params;
    return renderArtistPortfolioEditPage(id);
}
