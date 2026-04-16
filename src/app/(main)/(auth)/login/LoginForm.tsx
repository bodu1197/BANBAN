// @client-reason: useTransition hook for form submission state, useState for form inputs
"use client";

import { STRINGS } from "@/lib/strings";
import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
// SNS 로그인은 앱 심사 완료 전까지 비활성화. 재활성화 시 아래 주석 해제.
// import { loginWithProvider } from "./actions";
import { signInWithIdentifier } from "@/lib/supabase/auth-client";
// type OAuthProvider = "kakao" | "google" | "apple";
//
// interface OAuthProviderConfig {
//   provider: OAuthProvider;
//   className: string;
//   svgPath: string;
//   label: string;
// }
//
// const OAUTH_BUTTON_CLASS = "w-full gap-2";
//
// const OAUTH_PROVIDERS: OAuthProviderConfig[] = [
//   {
//     provider: "kakao",
//     className: OAUTH_BUTTON_CLASS,
//     svgPath: "M12 3c-5.52 0-10 3.59-10 8 0 2.82 1.88 5.29 4.71 6.71l-.96 3.57c-.09.32.26.59.55.43l4.26-2.85c.46.06.93.09 1.44.09 5.52 0 10-3.59 10-8s-4.48-8-10-8z",
//     label: STRINGS.auth.loginWithKakao,
//   },
//   {
//     provider: "google",
//     className: OAUTH_BUTTON_CLASS,
//     svgPath: "M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.785 2 2 6.785 2 12.545 2 18.305 6.785 23 12.545 23c5.014 0 9.363-3.631 10.181-8.497.132-.792.199-1.61.199-2.456 0-.532-.043-1.052-.125-1.557h-10.255z",
//     label: STRINGS.auth.loginWithGoogle,
//   },
//   {
//     provider: "apple",
//     className: OAUTH_BUTTON_CLASS,
//     svgPath: "M17.569 12.618c-.013-1.57.699-2.735 2.141-3.598-.782-1.138-1.977-1.793-3.563-1.983-1.512-.185-3.165.893-3.768.893-.635 0-2.111-.856-3.227-.856-2.303.037-4.76 1.9-4.76 5.654 0 1.108.197 2.25.592 3.428.526 1.559 2.427 5.391 4.414 5.326 1.021-.024 1.742-.737 3.076-.737 1.288 0 1.952.737 3.149.737 2.004-.024 3.715-3.493 4.221-5.054-2.689-1.282-2.275-3.762-2.275-3.81zm-2.122-6.804c1.175-1.428.992-2.735.951-3.2-1.002.062-2.166.69-2.83 1.424-.728.797-1.088 1.785-.991 2.891 1.088.086 2.081-.444 2.87-1.115z",
//     label: STRINGS.auth.loginWithApple,
//   },
// ];
/* eslint-disable max-lines-per-function */
export function LoginForm(): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // SNS 로그인은 앱 스토어 심사 완료 전까지 비활성화. true로 고정하여 ID 로그인만 노출.
  const isIdLogin = true;
  // const [isIdLogin, setIsIdLogin] = useState(false);
  // const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);

  // const handleOAuthLogin = (provider: OAuthProvider): void => {
  //   if (isPending) return;
  //   setPendingProvider(provider);
  //   setError(null);
  //   startTransition(async () => {
  //     try {
  //       const url = await loginWithProvider(provider);
  //       if (!url || url.includes("error=")) {
  //         setError(`OAuth failed: ${url}`);
  //         setPendingProvider(null);
  //         return;
  //       }
  //       globalThis.location.href = url;
  //     } catch (err) {
  //       setError(`OAuth error: ${err instanceof Error ? err.message : String(err)}`);
  //       setPendingProvider(null);
  //     }
  //   });
  // };

  const handleIdLogin = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const { error: loginError } = await signInWithIdentifier(username, password);
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
      {/* ID Login Form */}
      {isIdLogin ? (
        <form onSubmit={handleIdLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{STRINGS.auth.username}</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
              disabled={isPending}
              autoComplete="username"
              minLength={4}
              maxLength={12}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{STRINGS.auth.password}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              disabled={isPending}
              autoComplete="current-password"
              minLength={4}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
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

          {/* SNS 로그인 전환 버튼 — 앱 심사 완료 전까지 비활성화
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsIdLogin(false)}
          >
            {STRINGS.auth.loginWithSns}
          </Button>
          */}
        </form>
      ) : (
        // SNS 로그인 블록 — 앱 심사 완료 전까지 비활성화. isIdLogin=true 고정으로 이 분기는 렌더링되지 않음.
        <>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {/* OAuth Login Buttons
          {OAUTH_PROVIDERS.map(({ provider, className, svgPath, label }) => (
            <Button
              key={provider}
              type="button"
              variant="outline"
              className={className}
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
            onClick={() => setIsIdLogin(true)}
          >
            {STRINGS.auth.loginWithId}
          </Button>
          */}
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
