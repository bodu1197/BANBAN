export const PORTFOLIO_SECTION_IDS = {
  description: "portfolio-section-desc",
  reviews: "portfolio-section-reviews",
  artist: "portfolio-section-artist",
} as const;

export type PortfolioSectionId = (typeof PORTFOLIO_SECTION_IDS)[keyof typeof PORTFOLIO_SECTION_IDS];
