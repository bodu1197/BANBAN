import type { Metadata } from "next";
import { createAuthPage } from "@/lib/auth-page";
import { STRINGS } from "@/lib/strings";
import { LoginForm } from "@/app/(main)/(auth)/login/LoginForm";

export const metadata: Metadata = {
  title: STRINGS.auth.loginTitle,
  robots: { index: false, follow: false },
};

export default createAuthPage(
  { title: STRINGS.auth.loginTitle, requireGuest: true },
  () => <LoginForm />,
);
