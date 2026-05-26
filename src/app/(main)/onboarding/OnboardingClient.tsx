// @client-reason: 회원 유형 선택 인터랙션 + API 호출
"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Palette, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_ROUTES, type Role } from "@/lib/onboarding/constants";

interface RoleOption {
  role: Role;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "artist",
    icon: <Palette className="h-6 w-6" />,
    title: "반영구 시술사",
    description: "포트폴리오 등록 및 고객 관리",
  },
  {
    role: "user",
    icon: <User className="h-6 w-6" />,
    title: "일반 회원",
    description: "작품 구경 및 시술사 검색",
  },
];

function RoleCard({ option, isSelected, onSelect }: Readonly<{
  option: RoleOption;
  isSelected: boolean;
  onSelect: () => void;
}>): React.ReactElement {
  const cardBorder = isSelected
    ? "border-brand-primary bg-brand-primary/10"
    : "border-border hover:bg-muted focus-visible:bg-muted";
  const iconBg = isSelected
    ? "bg-brand-primary/10 text-brand-primary"
    : "bg-muted text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${cardBorder}`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {option.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{option.title}</p>
        <p className="text-sm text-muted-foreground">{option.description}</p>
      </div>
    </button>
  );
}

function useRoleSubmit(): { isPending: boolean; error: string | null; submit: (role: Role) => void } {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (role: Role): void => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/profiles/set-initial-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        const data = await res.json() as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          setError(data.error ?? "처리 중 오류가 발생했습니다");
          return;
        }
        // role 은 "user" | "artist" literal union 이므로 인젝션 가능성 없음
        // eslint-disable-next-line security/detect-object-injection
        router.push(ROLE_ROUTES[role]);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "네트워크 오류");
      }
    });
  };
  return { isPending, error, submit };
}

export function OnboardingClient(): React.ReactElement {
  const [selected, setSelected] = useState<Role | null>(null);
  const { isPending, error, submit } = useRoleSubmit();

  const handleSubmit = (): void => {
    if (!selected || isPending) return;
    submit(selected);
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">환영합니다!</h1>
        <p className="text-sm text-muted-foreground">가입 유형을 선택해주세요</p>
      </div>
      <div role="radiogroup" aria-label="회원 유형" className="space-y-3">
        {ROLE_OPTIONS.map((option) => (
          <RoleCard
            key={option.role}
            option={option}
            isSelected={selected === option.role}
            onSelect={() => setSelected(option.role)}
          />
        ))}
      </div>
      <div aria-live="polite" aria-atomic="true">
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
      <Button
        type="button"
        onClick={handleSubmit}
        className="w-full"
        disabled={!selected || isPending}
      >
        {isPending ? "처리 중..." : "시작하기"}
      </Button>
    </div>
  );
}
