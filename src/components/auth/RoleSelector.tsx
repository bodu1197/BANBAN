// @client-reason: 라디오 카드 선택 인터랙션
"use client";

import React from "react";
import { Palette, User } from "lucide-react";
import type { Role } from "@/lib/onboarding/constants";

/**
 * 회원 유형 카드 — RoleSelectStep (가입 첫 단계) + OnboardingClient (SNS 신규 가입자) 공통.
 * 반언니 도메인: "타투 아티스트" → "반영구 시술사" (UI 카피만 조정, 식별자 role="artist" 유지).
 */

export interface RoleOption {
  role: Role;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const ROLE_OPTIONS: ReadonlyArray<RoleOption> = [
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

interface RoleCardProps {
  option: RoleOption;
  isSelected: boolean;
  onSelect: () => void;
}

function RoleCard({ option, isSelected, onSelect }: Readonly<RoleCardProps>): React.ReactElement {
  const iconBg = isSelected
    ? "bg-brand-primary/10 text-brand-primary"
    : "bg-muted text-muted-foreground";
  const cardBorder = isSelected
    ? "border-brand-primary bg-brand-primary/10"
    : "border-border hover:bg-muted focus-visible:bg-muted";
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

interface RoleSelectorProps {
  selectedRole: Role | null;
  onSelect: (role: Role) => void;
  ariaLabel?: string;
}

export function RoleSelector({
  selectedRole,
  onSelect,
  ariaLabel = "회원 유형",
}: Readonly<RoleSelectorProps>): React.ReactElement {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="space-y-3">
      {ROLE_OPTIONS.map((option) => (
        <RoleCard
          key={option.role}
          option={option}
          isSelected={selectedRole === option.role}
          onSelect={() => onSelect(option.role)}
        />
      ))}
    </div>
  );
}
