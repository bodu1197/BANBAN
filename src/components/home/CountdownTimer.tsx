// @client-reason: useState/useEffect for real-time countdown timer updates
"use client";

import { useState, useEffect } from "react";

function getTimeLeft(endDate: string): { days: number; hours: number; minutes: number; seconds: number } | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export function CountdownTimer({ endDate }: Readonly<{ endDate: string }>): React.ReactElement | null {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(endDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (!timeLeft) return null;

  const pad = (n: number): string => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-1 text-sm font-mono font-bold tabular-nums" suppressHydrationWarning>
      {timeLeft.days > 0 && (
        <>
          <span className="rounded bg-foreground px-1.5 py-0.5 text-background" suppressHydrationWarning>{timeLeft.days}</span>
          <span className="text-muted-foreground">일</span>
        </>
      )}
      <span className="rounded bg-foreground px-1.5 py-0.5 text-background" suppressHydrationWarning>{pad(timeLeft.hours)}</span>
      <span className="text-brand-primary">:</span>
      <span className="rounded bg-foreground px-1.5 py-0.5 text-background" suppressHydrationWarning>{pad(timeLeft.minutes)}</span>
      <span className="text-brand-primary">:</span>
      <span className="rounded bg-foreground px-1.5 py-0.5 text-background" suppressHydrationWarning>{pad(timeLeft.seconds)}</span>
    </div>
  );
}
