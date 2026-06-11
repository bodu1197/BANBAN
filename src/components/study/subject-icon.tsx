import { ShieldPlus, HeartPulse, Droplet, Scale } from "lucide-react";
import type { SubjectKey } from "@/data/study/question-types";

/** 과목 → lucide 아이콘 엘리먼트. switch(bounded key) + 엘리먼트 직접 반환(render 중 컴포넌트 생성 회피). */
export function subjectGlyph(key: SubjectKey, className: string): React.ReactElement {
  switch (key) {
    case "hygiene": return <ShieldPlus className={className} aria-hidden="true" />;
    case "anatomy": return <HeartPulse className={className} aria-hidden="true" />;
    case "ink_material": return <Droplet className={className} aria-hidden="true" />;
    case "law": return <Scale className={className} aria-hidden="true" />;
  }
}
