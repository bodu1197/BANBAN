export { CategorySection } from "./category-selector";
export { PortfolioFormFields, MIN_DESCRIPTION_LEN } from "./portfolio-form-fields";
export { ExistingMediaGrid, ImageUploadSection, YouTubeUrlInput, extractYouTubeId } from "./media-upload";
export type { MediaItem, PortfolioFormValues } from "./types";
export {
    fetchCategories,
    uploadFiles,
    calcDiscountRate,
    syncCategories,
    insertMediaRowsWithEmbedding,
    insertCategorizables,
    uploadAllMedia,
    uploadNewMedia,
    savePortfolio,
} from "./portfolio-helpers";
export type { SavePayload } from "./portfolio-helpers";
export {
    EMPTY_PORTFOLIO_FORM,
    fileToBase64,
    requestAiDescription,
    validatePortfolioForm,
    createPortfolioRecord,
} from "./portfolio-submit";
export type { CreatePortfolioArgs } from "./portfolio-submit";
export { usePortfolioFormState } from "./use-portfolio-form-state";
export type { PortfolioFormState } from "./use-portfolio-form-state";
