// @client-reason: useState for checkbox state, interactive terms modal
"use client";

import { STRINGS } from "@/lib/strings";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
interface TermsState {
  privacy: boolean;
  terms: boolean;
}

interface TermsAgreementStepProps {
  termsAgreed: TermsState;
  setTermsAgreed: React.Dispatch<React.SetStateAction<TermsState>>;
  onNext: () => void;
}

interface TermsItemProps {
  id: keyof TermsState;
  checked: boolean;
  onCheck: (key: keyof TermsState, checked: boolean) => void;
  label: string;
  required: string;
  viewText: string;
  dialogTitle: string;
  dialogContent: string;
}

function TermsItem({ id, checked, onCheck, label, required, viewText, dialogTitle, dialogContent }: Readonly<TermsItemProps>): React.ReactElement {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center space-x-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(c) => onCheck(id, c === true)}
          aria-label={label}
        />
        <Label htmlFor={id} className="cursor-pointer">
          <span className="text-destructive">{required}</span> {label}
        </Label>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            {viewText}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="whitespace-pre-wrap pr-4 text-sm">{dialogContent}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgreeAllBox({ checked, onCheck, label, desc }: Readonly<{ checked: boolean; onCheck: (c: boolean) => void; label: string; desc: string }>): React.ReactElement {
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center space-x-3">
        <Checkbox id="agreeAll" checked={checked} onCheckedChange={(c) => onCheck(c === true)} aria-label={label} />
        <Label htmlFor="agreeAll" className="cursor-pointer text-base font-semibold">{label}</Label>
      </div>
      <p className="mt-1 pl-7 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

export function TermsAgreementStep({ termsAgreed, setTermsAgreed, onNext }: Readonly<TermsAgreementStepProps>): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const allChecked = termsAgreed.privacy && termsAgreed.terms;

  const handleAgreeAll = (checked: boolean): void => {
    setTermsAgreed({ privacy: checked, terms: checked });
    setError(null);
  };

  const handleSingleCheck = (key: keyof TermsState, checked: boolean): void => {
    setTermsAgreed((prev) => ({ ...prev, [key]: checked }));
    setError(null);
  };

  const handleNext = (): void => {
    if (!allChecked) { setError(STRINGS.auth.mustAgreeAll); return; }
    onNext();
  };

  return (
    <div className="space-y-6">
      <AgreeAllBox checked={allChecked} onCheck={handleAgreeAll} label={STRINGS.auth.agreeAll} desc={STRINGS.auth.agreeAllDesc} />
      <div className="space-y-4">
        <TermsItem id="privacy" checked={termsAgreed.privacy} onCheck={handleSingleCheck} label={STRINGS.auth.privacyPolicyAgree} required={STRINGS.auth.privacyPolicyRequired} viewText={STRINGS.auth.viewTerms} dialogTitle={STRINGS.pages.privacy} dialogContent={STRINGS.pages.privacyContent} />
        <TermsItem id="terms" checked={termsAgreed.terms} onCheck={handleSingleCheck} label={STRINGS.auth.termsOfServiceAgree} required={STRINGS.auth.termsOfServiceRequired} viewText={STRINGS.auth.viewTerms} dialogTitle={STRINGS.pages.terms} dialogContent={STRINGS.pages.termsContent} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" onClick={handleNext} className="w-full" disabled={!allChecked}>{STRINGS.common.next}</Button>
      <p className="text-center text-sm text-muted-foreground">
        {STRINGS.auth.hasAccount}{" "}
        <Link href={"/login"} className="font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{STRINGS.auth.loginNow}</Link>
      </p>
    </div>
  );
}
