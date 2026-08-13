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

/** 글쓰기로 만들 수 있는 게시판. 서버 화이트리스트(ALLOWED_WRITE_BOARDS)와 같은 집합이다. */
export type WriteBoard = "SHOP_IN_SHOP" | "QNA";

/**
 * 커뮤니티 탭 키 → 글이 저장될 게시판.
 * 목록·글쓰기·서버 기본값이 **모두 이 함수 하나만** 써야 "보던 탭 ≠ 저장된 게시판" 이 안 생긴다.
 * 모르는 값은 목록의 기본 탭과 같게 샵인샵으로 본다.
 */
export function boardFromTab(tab: string | undefined): WriteBoard {
  return tab === "qna" ? "QNA" : "SHOP_IN_SHOP";
}
