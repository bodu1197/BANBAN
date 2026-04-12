import { createPortfolioPageMetadata, createPortfolioPage } from "@/lib/portfolio-page";
import { STRINGS } from "@/lib/strings";

export const revalidate = 300;

const config = {
  typeArtist: "SEMI_PERMANENT" as const,
  slug: "women-beauty",
  title: STRINGS.pages.womenBeauty,
  description: STRINGS.pages.womenBeautyDesc,
  targetGender: "FEMALE" as const,
};

export const generateMetadata = createPortfolioPageMetadata(config);
export default createPortfolioPage(config);
