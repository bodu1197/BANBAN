import { createPortfolioPageMetadata, createPortfolioPage } from "@/lib/portfolio-page";
import { STRINGS } from "@/lib/strings";

export const revalidate = 300;

const config = {
  typeArtist: "TATTOO" as const,
  slug: "tattoo",
  title: STRINGS.pages.tattooSearch,
  description: STRINGS.pages.tattooSearchDesc,
};

export const generateMetadata = createPortfolioPageMetadata(config);
export default createPortfolioPage(config);
