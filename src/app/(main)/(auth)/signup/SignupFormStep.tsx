// @client-reason: 회원가입 폼은 단계별 입력·실시간 중복 확인·비밀번호 체크리스트 등 폼 라이프사이클 인터랙션이 본질이라 SSR로는 표현이 어렵다.
"use client";

import { STRINGS } from "@/lib/strings";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import React, { useState, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import type { SignupFormData, CreatedUser } from "./types";

interface SignupFormStepProps {
  formData: SignupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SignupFormData>>;
  onBack: () => void;
  onComplete: (user: CreatedUser) => void;
}

interface SignupResponse {
  success?: boolean;
  error?: string;
  emailVerificationRequired?: boolean;
  user?: { id: string; username: string; nickname: string; email: string };
}

async function signUp(data: {
  username: string;
  password: string;
  email: string;
}): Promise<{ error: Error | null; emailVerificationRequired?: boolean; user?: { id: string; username: string } }> {
  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result: SignupResponse = await response.json();
    if (!response.ok) return { error: new Error(result.error ?? "Registration failed") };
    return { error: null, emailVerificationRequired: result.emailVerificationRequired, user: result.user ? { id: result.user.id, username: result.user.username } : undefined };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error("An error occurred during registration") };
  }
}

type DupStatus = "idle" | "checking" | "available" | "taken";

interface DupCheckResponse {
  available?: boolean;
}

const DUP_LABELS: Record<string, { available: string; taken: string }> = {
  username: { available: "사용 가능한 아이디입니다", taken: "이미 사용 중인 아이디입니다" },
  email: { available: "사용 가능한 이메일입니다", taken: "이미 가입된 이메일입니다" },
};

function DupStatusIcon({ status, field }: Readonly<{ status: DupStatus; field: string }>): React.ReactElement | null {
  const labels = Object.hasOwn(DUP_LABELS, field) ? DUP_LABELS[field as keyof typeof DUP_LABELS] : null;
  if (!labels) return null;

  if (status === "checking") return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />확인 중...</span>;
  if (status === "available") return <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3 w-3" aria-hidden="true" />{labels.available}</span>;
  if (status === "taken") return <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3 w-3" aria-hidden="true" />{labels.taken}</span>;
  return null;
}

interface FormFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  dupStatus?: DupStatus;
  onBlurCheck?: () => void;
}

function FormField({ id, label, type, value, onChange, placeholder, disabled, autoComplete, minLength, maxLength, pattern, dupStatus, onBlurCheck }: Readonly<FormFieldProps>): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlurCheck} placeholder={placeholder} required disabled={disabled} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} pattern={pattern} />
      {dupStatus ? <DupStatusIcon status={dupStatus} field={id} /> : null}
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
export function SignupFormStep({ formData, setFormData, onBack, onComplete }: Readonly<SignupFormStepProps>): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [dupStatus, setDupStatus] = useState<Record<string, DupStatus>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const checkDuplicate = useCallback((field: string, value: string) => {
    if (!value.trim()) { setDupStatus((prev) => ({ ...prev, [field]: "idle" })); return; }
    if (field === "username" && !/^[A-Za-z][A-Za-z0-9]{3,11}$/.test(value)) return;
    if (field === "email" && !value.includes("@")) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    setDupStatus((prev) => ({ ...prev, [field]: "checking" }));

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-duplicate?field=${field}&value=${encodeURIComponent(value)}`);
        const data: DupCheckResponse = await res.json();
        setDupStatus((prev) => ({ ...prev, [field]: data.available ? "available" : "taken" }));
      } catch {
        setDupStatus((prev) => ({ ...prev, [field]: "idle" }));
      }
    }, 400);
  }, []);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (isPending) return;
    setError(null);
    if (formData.password !== confirmPassword) { setError(STRINGS.auth.passwordMismatch); return; }
    if (formData.password.length < PASSWORD_MIN_LENGTH) { setError(STRINGS.auth.passwordMinError); return; }
    if (Object.values(dupStatus).includes("taken")) { setError("중복된 항목을 수정해주세요"); return; }

    startTransition(async () => {
      const { error: signupError, emailVerificationRequired, user } = await signUp({
        username: formData.username, password: formData.password,
        email: formData.email,
      });
      if (signupError || !user) { setError(signupError?.message ?? "Registration failed"); return; }
      if (emailVerificationRequired) { setEmailSent(true); return; }
      onComplete(user);
    });
  };

  const updateField = (field: keyof SignupFormData) => (v: string) => setFormData((prev) => ({ ...prev, [field]: v }));

  if (emailSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Mail className="h-12 w-12 text-blue-700" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold">{STRINGS.auth.signupEmailSent}</h3>
        <p className="text-sm text-muted-foreground">{STRINGS.auth.checkEmailToComplete}</p>
        <p className="text-xs text-muted-foreground">({formData.email})</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{STRINGS.auth.backToLogin}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField id="username" label={STRINGS.auth.username} type="text" value={formData.username} onChange={updateField("username")} placeholder={STRINGS.auth.usernameRule} disabled={isPending} autoComplete="username" minLength={4} maxLength={12} pattern="^[A-Za-z][A-Za-z0-9]*$" dupStatus={dupStatus.username} onBlurCheck={() => checkDuplicate("username", formData.username)} />
      <FormField id="email" label={STRINGS.auth.email} type="email" value={formData.email} onChange={updateField("email")} placeholder="email@example.com" disabled={isPending} autoComplete="email" dupStatus={dupStatus.email} onBlurCheck={() => checkDuplicate("email", formData.email)} />
      <FormField id="password" label={STRINGS.auth.password} type="password" value={formData.password} onChange={updateField("password")} placeholder={STRINGS.auth.passwordRule} disabled={isPending} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} />
      <FormField id="confirmPassword" label={STRINGS.auth.confirmPassword} type="password" value={confirmPassword} onChange={setConfirmPassword} disabled={isPending} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} />
      <PasswordChecklist password={formData.password} confirmPassword={confirmPassword} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isPending}>{STRINGS.common.back}</Button>
        <Button type="submit" className="flex-1" disabled={isPending}>{isPending ? "..." : STRINGS.common.complete}</Button>
      </div>
    </form>
  );
}
