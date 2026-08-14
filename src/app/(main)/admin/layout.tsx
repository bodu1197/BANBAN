import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { QueryProvider } from "@/providers/QueryProvider";

export default async function AdminLayout({ children }: Readonly<{
    children: React.ReactNode;
}>): Promise<React.ReactElement> {
    const user = await getUser();
    if (!user) redirect("/login");

    const supabase = await createClient();
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (error || profile?.is_admin !== true) redirect("/");

    return (
        <QueryProvider>
            <AdminLayoutShell>{children}</AdminLayoutShell>
        </QueryProvider>
    );
}
