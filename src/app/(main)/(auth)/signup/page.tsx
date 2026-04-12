import type { Metadata } from "next";
import { createAuthPage } from "@/lib/auth-page";
import { STRINGS } from "@/lib/strings";
import { SignupWizard } from "@/app/(main)/(auth)/signup/SignupWizard";

export const metadata: Metadata = {
  title: STRINGS.auth.signupTitle,
  robots: { index: false, follow: false },
};

export default createAuthPage(
  { title: STRINGS.auth.signupTitle, requireGuest: true, className: "py-8 md:py-16" },
  () => <SignupWizard />,
);
