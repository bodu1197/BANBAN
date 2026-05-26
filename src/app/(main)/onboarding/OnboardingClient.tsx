// @client-reason: 회원 유형 선택 인터랙션 + API 호출
"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { ROLE_ROUTES, type Role } from "@/lib/onboarding/constants";

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
      <RoleSelector selectedRole={selected} onSelect={setSelected} />
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
