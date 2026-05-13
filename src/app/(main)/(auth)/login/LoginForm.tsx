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
