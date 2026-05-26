export type SignupRole = "user" | "artist";

export interface SignupFormData {
  username: string;
  email: string;
  password: string;
}

export interface CreatedUser {
  id: string;
  username: string;
  role: SignupRole;
}
