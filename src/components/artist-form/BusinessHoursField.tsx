// @client-reason: 시간 입력 + 휴무 토글 상태 관리 필요
"use client";

import { useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_OPEN_TIME, DEFAULT_CLOSE_TIME } from "@/types/artist-form";
import type { BusinessHoursMap, DayHours } from "@/types/artist-form";

const DAYS: readonly { key: string; label: string }[] = [
  { key: "mon", label: "월요일" },
  { key: "tue", label: "화요일" },
  { key: "wed", label: "수요일" },
  { key: "thu", label: "목요일" },
  { key: "fri", label: "금요일" },
  { key: "sat", label: "토요일" },
  { key: "sun", label: "일요일" },
];

interface BusinessHoursFieldProps {
  value: BusinessHoursMap;
  onChange: (hours: BusinessHoursMap) => void;
}

function DayRow({ dayKey, label, dayHours, onToggle, onTimeChange }: Readonly<{
  dayKey: string;
  label: string;
  dayHours: DayHours | null | undefined;
  onToggle: (key: string, isOpen: boolean) => void;
  onTimeChange: (key: string, field: "open" | "close", time: string) => void;
}>): React.ReactElement {
  const isOpen = dayHours !== null && dayHours !== undefined;
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-sm font-medium">{label}</span>
      <Switch
        checked={isOpen}
        onCheckedChange={(checked) => onToggle(dayKey, checked)}
        aria-label={`${label} 영업 여부`}
      />
      {isOpen ? (
        <div className="flex items-center gap-1.5">
          <input
            type="time"
            value={dayHours.open}
            onChange={(e) => onTimeChange(dayKey, "open", e.target.value)}
            className="h-8 rounded border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${label} 오픈 시간`}
          />
          <span className="text-xs text-muted-foreground">~</span>
          <input
            type="time"
            value={dayHours.close}
            onChange={(e) => onTimeChange(dayKey, "close", e.target.value)}
            className="h-8 rounded border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${label} 마감 시간`}
          />
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">휴무</span>
      )}
    </div>
  );
}

export function BusinessHoursField({ value, onChange }: Readonly<BusinessHoursFieldProps>): React.ReactElement {
  const updateDay = useCallback(
    (key: string, updated: DayHours | null) => {
      onChange({ ...value, [key]: updated });
    },
    [value, onChange],
  );

  const handleToggle = useCallback(
    (key: string, isOpen: boolean) => {
      updateDay(key, isOpen ? { open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME } : null);
    },
    [updateDay],
  );

  const handleTimeChange = useCallback(
    (key: string, field: "open" | "close", time: string) => {
      const current = value[key] as DayHours | null | undefined;
      if (!current) return;
      updateDay(key, { ...current, [field]: time });
    },
    [value, updateDay],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">영업시간</label>
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        {DAYS.map(({ key, label }) => (
          <DayRow
            key={key}
            dayKey={key}
            label={label}
            dayHours={value[key] as DayHours | null | undefined}
            onToggle={handleToggle}
            onTimeChange={handleTimeChange}
          />
        ))}
      </div>
    </div>
  );
}
