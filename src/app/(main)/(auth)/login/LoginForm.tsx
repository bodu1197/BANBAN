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
import { loginWithProvider } from "./actions";
import { signInWithIdentifier } from "@/lib/supabase/auth-client";
import type { OAuthProvider } from "@/lib/supabase/auth";

interface OAuthProviderConfig {
  provider: OAuthProvider;
  className: string;
  svgPath: string;
  label: string;
}

const OAUTH_BUTTON_CLASS = "w-full gap-2";

const OAUTH_PROVIDERS: OAuthProviderConfig[] = [
  {
    provider: "kakao",
    className: OAUTH_BUTTON_CLASS,
    svgPath: "M12 3c-5.52 0-10 3.59-10 8 0 2.82 1.88 5.29 4.71 6.71l-.96 3.57c-.09.32.26.59.55.43l4.26-2.85c.46.06.93.09 1.44.09 5.52 0 10-3.59 10-8s-4.48-8-10-8z",
    label: STRINGS.auth.loginWithKakao,
  },
  {
    provider: "google",
    className: OAUTH_BUTTON_CLASS,
    svgPath: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z M5.84 14.09a6.56 6.56 0 0 1 0-4.18V7.07H2.18a10.96 10.96 0 0 0 0 9.86l3.66-2.84z M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
    label: STRINGS.auth.loginWithGoogle,
  },
  {
    provider: "apple",
    className: OAUTH_BUTTON_CLASS,
    svgPath: "M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.51-3.23 0-1.44.64-2.2.45-3.06-.4C3.79 16.17 4.36 9.53 8.82 9.28c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.3 4.12zM12.03 9.2C11.88 7.16 13.5 5.5 15.4 5.35c.27 2.32-2.1 4.07-3.37 3.85z",
    label: STRINGS.auth.loginWithApple,
  },
];
/* eslint-disable max-lines-per-function */
export function LoginForm(): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isIdLogin, setIsIdLogin] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);

  const handleOAuthLogin = (provider: OAuthProvider): void => {
    if (isPending) return;
    setPendingProvider(provider);
    setError(null);
    startTransition(async () => {
      try {
        const url = await loginWithProvider(provider);
        if (!url || url.includes("error=")) {
          setError(`OAuth failed: ${url}`);
          setPendingProvider(null);
          return;
        }
        globalThis.location.href = url;
      } catch (err) {
        setError(`OAuth error: ${err instanceof Error ? err.message : String(err)}`);
        setPendingProvider(null);
      }
    });
  };

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

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsIdLogin(false)}
          >
            {STRINGS.auth.loginWithSns}
          </Button>
        </form>
      ) : (
        <>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
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
