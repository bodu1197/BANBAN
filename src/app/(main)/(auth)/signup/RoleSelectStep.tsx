// @client-reason: 회원 유형 카드 + SNS 가입 버튼 인터랙션
"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { signupWithProvider } from "./actions";
import { OAUTH_PROVIDERS, type OAuthProvider, type OAuthProviderConfig } from "@/lib/auth/oauth-providers";
import type { Role } from "@/lib/onboarding/constants";

interface RoleSelectStepProps {
  selectedRole: Role | null;
  onSelect: (role: Role) => void;
  onNext: () => void;
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

function useOAuthSignup(selectedRole: Role | null): {
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
      <RoleSelector selectedRole={selectedRole} onSelect={onSelect} />
      <div aria-live="polite" aria-atomic="true">
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
      <div className="space-y-3">
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
