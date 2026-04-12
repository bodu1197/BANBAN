import {
  fetchPopularArtists,
  fetchLowestPricePortfolios,
  fetchPopularPortfolios,
  fetchRecruitments,
  type ArtistTypeFilter,
  type HomeArtist,
  type HomePortfolio,
  type HomeRecruitment,
} from "./home-queries";

export interface HomeData {
  artists: HomeArtist[];
  lowest: HomePortfolio[];
  popular: HomePortfolio[];
  recruitments: HomeRecruitment[];
}

export async function fetchHomeData(typeArtist: ArtistTypeFilter): Promise<HomeData> {
  const [artists, lowest, popular, recruitments] = await Promise.all([
    fetchPopularArtists({ typeArtist, limit: 6 }),
    fetchLowestPricePortfolios({ typeArtist, limit: 10 }),
    fetchPopularPortfolios({ typeArtist, limit: 10 }),
    fetchRecruitments({ typeArtist, limit: 10 }),
  ]);
  return { artists, lowest, popular, recruitments };
}
