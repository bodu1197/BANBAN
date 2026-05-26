// @client-reason: useState for multi-step wizard state management
"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RoleSelectStep } from "./RoleSelectStep";
import { TermsAgreementStep } from "./TermsAgreementStep";
import { SignupFormStep } from "./SignupFormStep";
import { SignupCompleteStep } from "./SignupCompleteStep";
import type { SignupFormData, CreatedUser } from "./types";
import type { Role } from "@/lib/onboarding/constants";

type StepNumber = 1 | 2 | 3 | 4;

// 가입 흐름: 역할 선택 → 약관 → 폼 → 완료. SNS 가입 시 1단계에서 콜백 → /onboarding 또는 callback 의 intent 처리.
export function SignupWizard(): React.ReactElement {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [termsAgreed, setTermsAgreed] = useState({ privacy: false, terms: false });
  const [formData, setFormData] = useState<SignupFormData>({
    username: "",
    email: "",
    password: "",
  });
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);

  const handleRoleNext = useCallback(() => setCurrentStep(2), []);
  const handleTermsNext = useCallback(() => setCurrentStep(3), []);
  const handleFormBack = useCallback(() => setCurrentStep(2), []);
  const handleSignupComplete = useCallback((user: CreatedUser) => {
    setCreatedUser(user);
    setCurrentStep(4);
  }, []);
  const handleStartService = useCallback(() => {
    const target = createdUser?.role === "artist" ? "/mypage" : "/";
    router.push(target);
  }, [router, createdUser]);

  return (
    <div className="w-full">
      {currentStep === 1 && (
        <RoleSelectStep selectedRole={role} onSelect={setRole} onNext={handleRoleNext} />
      )}
      {currentStep === 2 && (
        <TermsAgreementStep
          termsAgreed={termsAgreed}
          setTermsAgreed={setTermsAgreed}
          onNext={handleTermsNext}
        />
      )}
      {currentStep === 3 && role && (
        <SignupFormStep
          formData={formData}
          setFormData={setFormData}
          role={role}
          onBack={handleFormBack}
          onComplete={handleSignupComplete}
        />
      )}
      {currentStep === 4 && (
        <SignupCompleteStep user={createdUser} onStartService={handleStartService} />
      )}
    </div>
  );
}
