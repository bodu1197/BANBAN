// @client-reason: Interactive buttons for navigation
"use client";

import { STRINGS } from "@/lib/strings";
import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Palette, User } from "lucide-react";
import type { CreatedUser } from "./types";

interface SignupCompleteStepProps {
  user: CreatedUser | null;
  onStartService: () => void;
  onArtistRegister: () => void;
}

function RoleCard({ icon, title, description, onClick, variant }: Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  variant: "default" | "artist";
}>): React.ReactElement {
  const isArtist = variant === "artist";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isArtist
          ? "border-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 focus-visible:bg-brand-primary/10"
          : "border-border hover:bg-muted focus-visible:bg-muted"
      }`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
        isArtist ? "bg-brand-primary/10 text-brand-primary" : "bg-muted text-muted-foreground"
      }`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

export function SignupCompleteStep({ user,
  onStartService,
  onArtistRegister,
}: Readonly<SignupCompleteStepProps>): React.ReactElement {
  return (
    <div className="flex flex-col items-center space-y-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-12 w-12 text-green-600" />
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

      <div className="w-full max-w-sm space-y-3">
        <p className="text-center text-sm font-medium text-muted-foreground">어떤 유형의 회원이신가요?</p>
        <RoleCard
          icon={<User className="h-6 w-6" />}
          title="일반 회원"
          description="반영구 작품 구경 및 아티스트 검색"
          onClick={onStartService}
          variant="default"
        />
        <RoleCard
          icon={<Palette className="h-6 w-6" />}
          title="반영구 아티스트"
          description="포트폴리오 등록 및 고객 관리"
          onClick={onArtistRegister}
          variant="artist"
        />
      </div>

      <Button
        variant="ghost"
        onClick={onStartService}
        className="text-sm text-muted-foreground"
      >
        나중에 결정하기
      </Button>
    </div>
  );
}
