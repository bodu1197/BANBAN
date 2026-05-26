// @client-reason: OAuth 리다이렉트 + 이메일 폼 토글 흐름이 클라이언트 상태 머신을 필요로 한다(provider별 로딩 상태, 에러 인라인 표시).
"use client";

import { STRINGS } from "@/lib/strings";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import React, { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { loginWithProvider } from "./actions";
import { signInWithEmail } from "@/lib/supabase/auth-client";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/auth/oauth-providers";
import { getLabelFromSlug } from "@/lib/auth-labels";

function describeAuthError(error: string | null, method: string | null): string | null {
  if (!error) return null;
  if (error === "email_already_registered") {
    const label = getLabelFromSlug(method);
    // 라벨이 모두 받침 없는 단어 (구글/카카오/애플/이메일) — 조사 "로" 사용
    return `이미 ${label}로 가입된 이메일입니다. ${label} 로그인을 이용해 주세요.`;
  }
  if (error === "auth_callback_error") {
    return "로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.";
  }
  return null;
}

const OAUTH_BUTTON_CLASS = "w-full gap-2";
/* eslint-disable max-lines-per-function */
export function LoginForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);

  // URL 쿼리스트링 에러를 메시지로 변환 — useMemo 로 파생 상태 표현 (setState in effect 회피)
  const errorParam = searchParams.get("error");
  const methodParam = searchParams.get("method");
  const urlErrorMessage = useMemo(() => describeAuthError(errorParam, methodParam), [errorParam, methodParam]);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? urlErrorMessage;
  const setError = setLocalError;

  // URL 에 error 가 있으면 정리 — 새로고침/공유 시 에러 재노출, 검색엔진 인덱싱 방지
  useEffect(() => {
    if (errorParam) router.replace("/login");
  }, [errorParam, router]);

  const handleOAuthLogin = (provider: OAuthProvider): void => {
    if (isPending) return;
    setPendingProvider(provider);
    setError(null);
    startTransition(async () => {
      try {
        const result = await loginWithProvider(provider);
        if (!result.ok) {
          setError(`OAuth 로그인 실패: ${result.error}`);
          setPendingProvider(null);
          return;
        }
        globalThis.location.href = result.url;
      } catch (err: unknown) {
        setError(`OAuth 오류: ${err instanceof Error ? err.message : String(err)}`);
        setPendingProvider(null);
      }
    });
  };

  const handleEmailLogin = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const { error: loginError } = await signInWithEmail(email, password);
      if (loginError) {
        setError(loginError.message);
      } else {
        router.push("/");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {isEmailLogin ? (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              {STRINGS.auth.email}
              <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              disabled={isPending}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {STRINGS.auth.password}
              <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              disabled={isPending}
              autoComplete="current-password"
              minLength={PASSWORD_MIN_LENGTH}
            />
          </div>

          {error && (
            <p id="login-error" className="text-sm text-destructive" role="alert" aria-live="polite">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "..." : STRINGS.common.login}
          </Button>

          <div className="text-center">
            <Link
              href={"/reset-password"}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {STRINGS.auth.forgotPassword}
            </Link>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsEmailLogin(false)}
          >
            {STRINGS.auth.loginWithSns}
          </Button>
        </form>
      ) : (
        <>
          {error && (
            <p className="text-sm text-destructive" role="alert" aria-live="polite">{error}</p>
          )}
          {OAUTH_PROVIDERS.map(({ provider, svgPath, label }) => (
            <Button
              key={provider}
              type="button"
              variant="outline"
              className={OAUTH_BUTTON_CLASS}
              size="lg"
              onClick={() => handleOAuthLogin(provider)}
              disabled={isPending}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d={svgPath} />
              </svg>
              {pendingProvider === provider ? "..." : label}
            </Button>
          ))}

          <Separator className="my-4" />

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsEmailLogin(true)}
          >
            {STRINGS.auth.loginWithEmail}
          </Button>
        </>
      )}

      <Separator className="my-4" />

      <p className="text-center text-sm text-muted-foreground">
        {STRINGS.auth.noAccount}{" "}
        <Link
          href={"/signup"}
          className="font-medium text-foreground hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STRINGS.auth.signupNow}
        </Link>
      </p>
    </div>
  );
}
