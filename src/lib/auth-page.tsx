import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser } from "@/lib/supabase/auth";

interface AuthPageConfig {
  title: string;
  requireGuest?: boolean;
  className?: string;
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
      <main className={`flex flex-1 items-center justify-center px-4 ${config.className ?? "py-16"}`}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{config.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderForm()}
          </CardContent>
        </Card>
      </main>
    );
  };
}
