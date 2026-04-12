// @client-reason: useState for multi-step wizard state management
"use client";

import { STRINGS } from "@/lib/strings";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TermsAgreementStep } from "./TermsAgreementStep";
import { SignupFormStep } from "./SignupFormStep";
import { SignupCompleteStep } from "./SignupCompleteStep";
import type { SignupFormData, CreatedUser } from "./types";
type StepNumber = 1 | 2 | 3;

interface StepIndicatorProps {
  currentStep: StepNumber;
  steps: Array<{ number: number; title: string }>;
}

function StepIndicator({ currentStep, steps }: Readonly<StepIndicatorProps>): React.ReactElement {
  return (
    <div className="mb-8 flex items-center justify-center">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <StepItem step={step} isActive={currentStep >= step.number} />
          {index < steps.length - 1 && (
            <StepConnector isActive={currentStep > step.number} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function StepItem({ step, isActive }: Readonly<{ step: { number: number; title: string }; isActive: boolean }>): React.ReactElement {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          isActive ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"
        }`}
      >
        {step.number}
      </div>
      <span className={`mt-1 text-xs ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
        {step.title}
      </span>
    </div>
  );
}

function StepConnector({ isActive }: Readonly<{ isActive: boolean }>): React.ReactElement {
  return <div className={`mx-2 h-0.5 w-12 ${isActive ? "bg-brand-primary" : "bg-muted"}`} />;
}

export function SignupWizard(): React.ReactElement {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [termsAgreed, setTermsAgreed] = useState({ privacy: false, terms: false });
  const [formData, setFormData] = useState<SignupFormData>({
    username: "", email: "", password: "",
  });
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);

  const handleTermsNext = useCallback(() => setCurrentStep(2), []);
  const handleFormBack = useCallback(() => setCurrentStep(1), []);
  const handleSignupComplete = useCallback((user: CreatedUser) => {
    setCreatedUser(user);
    setCurrentStep(3);
  }, []);
  const handleStartService = useCallback(() => router.push("/"), [router]);
  const handleArtistRegister = useCallback(() => router.push("/register/artist"), [router]);

  const steps = [
    { number: 1, title: STRINGS.auth.step1Title },
    { number: 2, title: STRINGS.auth.step2Title },
    { number: 3, title: STRINGS.auth.step3Title },
  ];

  return (
    <div className="w-full">
      <StepIndicator currentStep={currentStep} steps={steps} />
      {currentStep === 1 && (
        <TermsAgreementStep termsAgreed={termsAgreed} setTermsAgreed={setTermsAgreed} onNext={handleTermsNext} />
      )}
      {currentStep === 2 && (
        <SignupFormStep formData={formData} setFormData={setFormData} onBack={handleFormBack} onComplete={handleSignupComplete} />
      )}
      {currentStep === 3 && (
        <SignupCompleteStep user={createdUser} onStartService={handleStartService} onArtistRegister={handleArtistRegister} />
      )}
    </div>
  );
}
