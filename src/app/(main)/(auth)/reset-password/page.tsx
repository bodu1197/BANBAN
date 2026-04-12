import type { Metadata } from "next";
import { createAuthPage } from "@/lib/auth-page";
import { STRINGS } from "@/lib/strings";
import { ResetPasswordForm } from "@/app/(main)/(auth)/reset-password/ResetPasswordForm";

export const metadata: Metadata = {
  title: STRINGS.auth.forgotPassword,
  robots: { index: false, follow: false },
};

export default createAuthPage(
  { title: STRINGS.auth.forgotPassword, requireGuest: false },
  () => <ResetPasswordForm />,
);
