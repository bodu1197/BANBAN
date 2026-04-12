/**
 * Home page queries — re-export barrel for backward compatibility.
 *
 * Actual implementations live in:
 *   - home-artist-queries.ts    (popular artists, reviewed artists)
 *   - home-portfolio-queries.ts (discounted, lowest price, event, popular portfolios)
 *   - home-recruitment-queries.ts (recruitments, categories)
 */

// Types
export type { HomePortfolio } from "./portfolio-common";
export type {
  HomeArtist,
  ReviewedArtist,
  ArtistTypeFilter,
} from "./home-artist-queries";
export type { HomeRecruitment } from "./home-recruitment-queries";

// Artist queries
export { fetchPopularArtists, fetchReviewedArtists, fetchActiveArtists } from "./home-artist-queries";

// Portfolio queries
export {
  fetchLowestPricePortfolios,
  fetchPopularPortfolios,
  fetchEyebrowPortfolios,
  fetchDiscountPortfolios,
} from "./home-portfolio-queries";

// Recruitment & category queries
export { fetchRecruitments, fetchCategories } from "./home-recruitment-queries";
