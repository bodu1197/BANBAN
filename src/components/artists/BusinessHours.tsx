// @client-reason: 오늘 요일 하이라이트에 new Date() 필요 + useState(expanded) 토글
"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayHours, BusinessHoursMap } from "@/types/artist-form";

interface BusinessHoursProps {
  hours: BusinessHoursMap;
}

const DAYS: readonly { key: string; label: string }[] = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
] as const;

const JS_DAY_TO_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function formatHours(dayHours: DayHours | null | undefined): string {
  return dayHours ? `${dayHours.open} - ${dayHours.close}` : "휴무";
}

export function BusinessHours({ hours }: Readonly<BusinessHoursProps>): React.ReactElement {
  const todayKey = useMemo(() => JS_DAY_TO_KEY[new Date().getDay()], []);
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const todayEntry = DAYS.find((d) => d.key === todayKey);
  const todayHours = hours[todayKey] as DayHours | null | undefined;

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label="영업시간 펼치기"
        className="flex min-h-[44px] w-full items-center justify-between text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-lg"
      >
        <span className="font-semibold text-foreground">영업시간</span>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-brand-primary">
            {todayEntry?.label ?? ""} {formatHours(todayHours)}
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-muted-foreground motion-safe:transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </div>
      </button>

      {expanded ? (
        <div className="mt-2 space-y-1">
          {DAYS.map(({ key, label }) => {
            const isToday = key === todayKey;
            const dayHours = hours[key] as DayHours | null | undefined;

            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-0.5 text-xs",
                  isToday
                    ? "bg-brand-primary/10 font-semibold text-brand-primary"
                    : "text-muted-foreground",
                )}
              >
                <span className="w-4 text-center">{label}</span>
                {isToday ? (
                  <span className="rounded bg-brand-primary px-1 py-px text-[10px] font-bold text-white">
                    오늘
                  </span>
                ) : null}
                <span className="ml-auto">{formatHours(dayHours)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
