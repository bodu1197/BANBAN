import { STRINGS } from "@/lib/strings";

const t = STRINGS.community;

export const BOARD_LABEL_MAP: Record<string, string> = {
  SHOP_IN_SHOP: t.shopInShop,
  PROCEDURE_REVIEW: t.procedureReview,
  COURSE_REVIEW: t.courseReview,
  QNA: t.qna,
  FREETALK: t.freeTalk,
  REVIEW: t.review,
};

export function boardLabel(typeBoard: string): string {
  const record = BOARD_LABEL_MAP as Record<string, string>;
  // eslint-disable-next-line security/detect-object-injection -- typed Record lookup
  return record[typeBoard] ?? typeBoard;
}
