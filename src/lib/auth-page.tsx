import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser } from "@/lib/supabase/auth";
import { AuthStudyPromo } from "@/components/auth/AuthStudyPromo";

interface AuthPageConfig {
  title: string;
  requireGuest?: boolean;
  className?: string;
  studyPromo?: boolean; // 상단에 공부방 오픈 안내 배너 표시 (로그인·회원가입)
}

export function createAuthPage(
  config: AuthPageConfig,
  renderForm: () => React.ReactElement,
) {
  return async function AuthPage(): Promise<React.ReactElement> {
    if (config.requireGuest !== false) {
      const user = await getUser();
      if (user) redirect("/");
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
