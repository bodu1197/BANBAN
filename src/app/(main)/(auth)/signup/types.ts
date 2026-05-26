import type { Role } from "@/lib/onboarding/constants";

export interface SignupFormData {
  username: string;
  email: string;
  password: string;
}

export interface CreatedUser {
  id: string;
  username: string;
  role: Role;
}
