import { GraduationCap } from "lucide-react";

// 로그인/회원가입 페이지 상단 공지 배너 — 공부방 오픈 + 이용 조건(샵 등록·승인) 안내.
export function AuthStudyPromo(): React.ReactElement {
  return (
    <aside aria-label="공부방 오픈 안내" className="mb-5 w-full max-w-md rounded-2xl border border-brand-primary/30 bg-brand-primary/10 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-primary text-white">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">문신사 국가시험 공부방 오픈</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            샵을 등록하고 승인받으면 시험 대비 공부방을 이용할 수 있어요.
          </p>
        </div>
      </div>
    </aside>
  );
}
