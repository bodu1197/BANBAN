// @client-reason: 오늘 요일 하이라이트에 new Date() 필요 → SSR mismatch 방지
"use client";

import { useMemo } from "react";
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

export function BusinessHours({ hours }: Readonly<BusinessHoursProps>): React.ReactElement {
  const todayKey = useMemo(() => JS_DAY_TO_KEY[new Date().getDay()], []);

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2.5">
      <p className="mb-2 text-xs font-semibold text-foreground">영업시간</p>
      <div className="space-y-1">
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
              <span className="ml-auto">
                {dayHours ? `${dayHours.open} - ${dayHours.close}` : "휴무"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
