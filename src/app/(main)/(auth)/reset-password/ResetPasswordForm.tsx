// @client-reason: useTransition hook for form submission state, useState for form inputs
"use client";

import { STRINGS } from "@/lib/strings";
import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Circle } from "lucide-react";
import { resetPassword, updatePassword } from "@/lib/supabase/auth-client";

function ResetPasswordChecklist({ password, confirmPassword }: Readonly<{ password: string; confirmPassword: string }>): React.ReactElement | null {
  if (!password) return null;
  const rules = [
    { label: "8자 이상 입력", met: password.length >= 8 },
    { label: "영문(a-z, A-Z) 포함", met: /[A-Za-z]/.test(password) },
    { label: "숫자(0-9) 포함", met: /\d/.test(password) },
  ];
  const showMatch = confirmPassword.length > 0;
  return (
    <ul className="space-y-1 pt-1">
      {rules.map((rule) => (
        <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.met ? "text-blue-600" : "text-muted-foreground"}`}>
          {rule.met ? <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" /> : <Circle className="h-3 w-3 shrink-0" aria-hidden="true" />}
          {rule.label}
        </li>
      ))}
      {showMatch && (
        <li className={`flex items-center gap-1.5 text-xs ${password === confirmPassword ? "text-blue-600" : "text-destructive"}`}>
          {password === confirmPassword ? <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" /> : <XCircle className="h-3 w-3 shrink-0" aria-hidden="true" />}
          비밀번호 일치
        </li>
      )}
    </ul>
  );
}
/* eslint-disable max-lines-per-function */
export function ResetPasswordForm(): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // URL에서 토큰/에러 확인
  React.useEffect(() => {
    if (typeof globalThis === "undefined" || !globalThis.location) return;
    const hash = globalThis.location.hash;
    const params = new URLSearchParams(globalThis.location.search);

    if (hash.includes("type=recovery")) {
      setIsUpdateMode(true);
    } else if (params.get("error") === "link_expired") {
      setError("비밀번호 재설정 링크가 만료되었습니다. 다시 요청해주세요.");
    }
  }, []);

  const handleRequestReset = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    });
  };

  const handleUpdatePassword = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(STRINGS.auth.passwordMismatch);
      return;
    }

    if (newPassword.length < 8) {
      setError(STRINGS.auth.passwordMinError);
      return;
    }

    startTransition(async () => {
      const { error: updateError } = await updatePassword(newPassword);
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
      }
    });
  };

  if (success && !isUpdateMode) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-green-800">
            {STRINGS.auth.resetEmailSent}
          </p>
          <p className="mt-2 text-sm text-green-700">
            {STRINGS.auth.checkEmailToReset}
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={"/login"}>{STRINGS.auth.backToLogin}</Link>
        </Button>
      </div>
    );
  }

  if (success && isUpdateMode) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-green-800">
            {STRINGS.auth.passwordChanged}
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href={"/login"}>{STRINGS.common.login}</Link>
        </Button>
      </div>
    );
  }

  // 비밀번호 업데이트 모드 (이메일 링크에서 왔을 경우)
  if (isUpdateMode) {
    return (
      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {STRINGS.auth.enterNewPassword}
        </p>

        <div className="space-y-2">
          <Label htmlFor="newPassword">{STRINGS.auth.password}</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={STRINGS.auth.passwordMinLength}
            required
            disabled={isPending}
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{STRINGS.auth.confirmPassword}</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isPending}
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <ResetPasswordChecklist password={newPassword} confirmPassword={confirmPassword} />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "..." : STRINGS.auth.changePassword}
        </Button>
      </form>
    );
  }

  // 비밀번호 재설정 요청 모드
  return (
    <form onSubmit={handleRequestReset} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {STRINGS.auth.resetDescription}
      </p>

      <div className="space-y-2">
        <Label htmlFor="email">{STRINGS.auth.email}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
          disabled={isPending}
          autoComplete="email"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "..." : STRINGS.auth.sendResetEmail}
      </Button>

      <div className="text-center">
        <Link
          href={"/login"}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STRINGS.common.back}
        </Link>
      </div>
    </form>
  );
}
