import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser } from "@/lib/supabase/auth";
import { sanitizeNext } from "@/lib/auth/next-path";
import { AuthStudyPromo } from "@/components/auth/AuthStudyPromo";

interface AuthPageConfig {
  title: string;
  requireGuest?: boolean;
  className?: string;
  studyPromo?: boolean; // 상단에 공부방 오픈 안내 배너 표시 (로그인·회원가입)
}

interface AuthPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

/** ?next= 는 배열로도 올 수 있다(같은 키 반복) — 문자열일 때만 쓴다. */
function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  return Array.isArray(value) ? value[0] ?? null : null;
}

export function createAuthPage(
  config: AuthPageConfig,
  renderForm: () => React.ReactElement,
) {
  return async function AuthPage({ searchParams }: Readonly<AuthPageProps>): Promise<React.ReactElement> {
    if (config.requireGuest !== false) {
      const user = await getUser();
      // 이미 로그인한 사람이 ?next= 를 달고 오면(뒤로가기·오래된 링크) 그 곳으로 보낸다.
      if (user) redirect(sanitizeNext(firstParam((await searchParams)?.next)));
    }

    return (
      <div className={`flex flex-1 flex-col items-center justify-center px-4 ${config.className ?? "py-16"}`}>
        {config.studyPromo ? <AuthStudyPromo /> : null}
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{config.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderForm()}
          </CardContent>
        </Card>
      </div>
    );
  };
}
