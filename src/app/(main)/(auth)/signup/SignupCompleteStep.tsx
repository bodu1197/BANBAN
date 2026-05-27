// @client-reason: Interactive button for navigation
"use client";

import { STRINGS } from "@/lib/strings";
import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Palette } from "lucide-react";
import type { CreatedUser } from "./types";

interface SignupCompleteStepProps {
  user: CreatedUser | null;
  onStartService: () => void;
}

function ArtistNextSteps(): React.ReactElement {
  return (
    <div className="w-full max-w-sm rounded-xl border-2 border-brand-primary/30 bg-brand-primary/5 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Palette className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">아티스트로 가입되었습니다</p>
          <p className="text-xs text-muted-foreground">
            마이페이지에서 샵 정보를 등록하면 검색에 노출됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SignupCompleteStep({
  user,
  onStartService,
}: Readonly<SignupCompleteStepProps>): React.ReactElement {
  const isArtist = user?.role === "artist";
  const buttonLabel = isArtist ? "마이페이지로 이동" : "시작하기";

  return (
    <div className="flex flex-col items-center space-y-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" aria-hidden="true" />
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">{STRINGS.auth.welcomeMessage}</h2>
        <p className="text-muted-foreground">{STRINGS.auth.welcomeDesc}</p>
        {user && (
          <p className="mt-4 text-sm text-muted-foreground">
            {STRINGS.auth.welcomePersonalized.replace("{username}", user.username)}
          </p>
        )}
      </div>
      {isArtist && <ArtistNextSteps />}
      <Button type="button" onClick={onStartService} className="w-full max-w-sm">
        {buttonLabel}
      </Button>
    </div>
  );
}
