import type { ReactNode } from "react";

interface LayoutContainerProps {
  children: ReactNode;
  /** 컨테이너 변형 — default(1024px) 는 PC 전체 폭 활용, narrow(767px) 는 콘텐츠 중심 페이지 (마이페이지 등) */
  width?: "default" | "narrow";
  className?: string;
  as?: "div" | "main" | "section" | "header" | "footer" | "nav";
}

function getMaxWidthClass(width: "default" | "narrow"): string {
  return width === "narrow" ? "max-w-[767px]" : "max-w-[1024px]";
}

/** 페이지·헤더·푸터 공통 컨테이너 — 양쪽 자동 마진 + 폭 제한 + 좌우 패딩 */
export function LayoutContainer({
  children,
  width = "default",
  className = "",
  as: Tag = "div",
}: Readonly<LayoutContainerProps>): React.ReactElement {
  const maxW = getMaxWidthClass(width);
  return (
    <Tag className={`mx-auto w-full ${maxW} px-4 md:px-6 ${className}`.trim()}>
      {children}
    </Tag>
  );
}
