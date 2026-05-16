import { CheckCircle2, XCircle, Circle } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";

interface PasswordChecklistProps {
  password: string;
  confirmPassword: string;
}

interface Rule {
  label: string;
  met: boolean;
}

export function PasswordChecklist({
  password,
  confirmPassword,
}: Readonly<PasswordChecklistProps>): React.ReactElement | null {
  if (!password) return null;

  const rules: Rule[] = [
    { label: `${PASSWORD_MIN_LENGTH}자 이상 입력`, met: password.length >= PASSWORD_MIN_LENGTH },
    { label: "영문(a-z, A-Z) 포함", met: /[A-Za-z]/.test(password) },
    { label: "숫자(0-9) 포함", met: /\d/.test(password) },
  ];

  const showMatch = confirmPassword.length > 0;

  return (
    <ul className="space-y-1 pt-1" role="status" aria-live="polite">
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-1.5 text-xs ${
            rule.met ? "text-blue-800" : "text-muted-foreground"
          }`}
          aria-label={`${rule.label} — ${rule.met ? "완료" : "미충족"}`}
        >
          {rule.met ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
          ) : (
            <Circle className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}
          {rule.label}
        </li>
      ))}
      {showMatch ? (
        <li
          className={`flex items-center gap-1.5 text-xs ${
            password === confirmPassword ? "text-blue-800" : "text-destructive"
          }`}
          aria-label={`비밀번호 일치 — ${password === confirmPassword ? "완료" : "불일치"}`}
        >
          {password === confirmPassword ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}
          비밀번호 일치
        </li>
      ) : null}
    </ul>
  );
}
