import { createPortfolioPageMetadata, createPortfolioPage } from "@/lib/portfolio-page";
import { STRINGS } from "@/lib/strings";

export const revalidate = 300;

const config = {
  typeArtist: "SEMI_PERMANENT" as const,
  slug: "mens-beauty",
  title: STRINGS.pages.mensBeauty,
  description: STRINGS.pages.mensBeautyDesc,
  targetGender: "MALE" as const,
};

export const generateMetadata = createPortfolioPageMetadata(config);
export default createPortfolioPage(config);
