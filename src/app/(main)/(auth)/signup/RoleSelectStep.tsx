// @client-reason: 회원 유형 카드 + SNS 가입 버튼 인터랙션
"use client";

import React, { useState, useTransition } from "react";
import { Palette, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signupWithProvider } from "./actions";
import { OAUTH_PROVIDERS, type OAuthProvider, type OAuthProviderConfig } from "@/lib/auth/oauth-providers";
import type { SignupRole } from "./types";

interface RoleSelectStepProps {
  selectedRole: SignupRole | null;
  onSelect: (role: SignupRole) => void;
  onNext: () => void;
}

interface RoleOption {
  role: SignupRole;
  icon: React.ReactNode;
  title: string;
  description: string;
}

// 반언니 도메인: "타투 아티스트" → "반영구 시술사" (UI 카피만 조정, 식별자는 role="artist" 유지)
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
  const isArtist = option.role === "artist";
  const iconBg = isArtist || isSelected
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

function OAuthButton({ config, disabled, isPending, onClick }: Readonly<{
  config: OAuthProviderConfig;
  disabled: boolean;
  isPending: boolean;
  onClick: () => void;
}>): React.ReactElement {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-2"
      onClick={onClick}
      disabled={disabled}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={config.svgPath} />
      </svg>
      {isPending ? "..." : config.label}
    </Button>
  );
}

function useOAuthSignup(selectedRole: SignupRole | null): {
  isPending: boolean;
  pendingProvider: OAuthProvider | null;
  error: string | null;
  handleOAuth: (provider: OAuthProvider) => void;
} {
  const [isPending, startTransition] = useTransition();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = (provider: OAuthProvider): void => {
    if (!selectedRole || isPending) return;
    setError(null);
    setPendingProvider(provider);
    startTransition(async () => {
      try {
        const result = await signupWithProvider(provider, selectedRole);
        if (!result.ok) {
          setError("SNS 가입에 실패했습니다");
          setPendingProvider(null);
          return;
        }
        globalThis.location.href = result.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "SNS 가입 오류");
        setPendingProvider(null);
      }
    });
  };
  return { isPending, pendingProvider, error, handleOAuth };
}

export function RoleSelectStep({
  selectedRole,
  onSelect,
  onNext,
}: Readonly<RoleSelectStepProps>): React.ReactElement {
  const { isPending, pendingProvider, error, handleOAuth } = useOAuthSignup(selectedRole);
  const oauthDisabled = !selectedRole || isPending;
  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label="회원 유형" className="space-y-3">
        {ROLE_OPTIONS.map((option) => (
          <RoleCard
            key={option.role}
            option={option}
            isSelected={selectedRole === option.role}
            onSelect={() => onSelect(option.role)}
          />
        ))}
      </div>
      {error && <p className="text-sm text-destructive" role="alert" aria-live="polite">{error}</p>}
      <div className="space-y-3" aria-disabled={!selectedRole}>
        {!selectedRole && (
          <p className="text-center text-xs text-muted-foreground">
            회원 유형을 먼저 선택해주세요
          </p>
        )}
        {OAUTH_PROVIDERS.map((config) => (
          <OAuthButton
            key={config.provider}
            config={config}
            disabled={oauthDisabled}
            isPending={pendingProvider === config.provider}
            onClick={() => handleOAuth(config.provider)}
          />
        ))}
      </div>
      <Separator />
      <Button
        type="button"
        onClick={onNext}
        variant="outline"
        className="w-full"
        disabled={!selectedRole}
      >
        이메일로 가입
      </Button>
    </div>
  );
}
