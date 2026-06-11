import { Clock } from "lucide-react";

/** pending 샵 체험 잔여일 안내 배너. */
export function StudyTrialBanner({ daysLeft }: Readonly<{ daysLeft: number }>): React.ReactElement {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
      <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>무료 체험 <strong>{daysLeft}일</strong> 남았어요 · 샵이 승인되면 공부방을 제한 없이 이용할 수 있어요.</span>
    </div>
  );
}
