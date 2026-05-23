/**
 * Portfolio form 컴포넌트용 helpers — 호환을 위한 re-export 레이어.
 *
 * 분할 결과:
 *  - pure functions: `@/lib/portfolio/helpers` (calcDiscountRate)
 *  - client-side functions: `@/lib/portfolio/client-helpers` (Supabase client + DOM 의존)
 *
 * 기존 import 호환을 위해 여기서 그대로 re-export.
 */

export { calcDiscountRate } from "@/lib/portfolio/helpers";

export {
    fetchCategories,
    uploadFiles,
    syncCategories,
    insertCategorizables,
    insertMediaRowsWithEmbedding,
    uploadAllMedia,
    uploadNewMedia,
    savePortfolio,
    type SavePayload,
} from "@/lib/portfolio/client-helpers";
